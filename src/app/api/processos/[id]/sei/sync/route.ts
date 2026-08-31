import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function solveCaptcha(buf: Buffer): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const { createWorker } = await import("tesseract.js");
    const processed = await sharp(buf).grayscale().threshold(150).normalize().toBuffer();
    const worker = await createWorker("eng");
    // @ts-ignore
    await worker.setParameters({ tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" });
    const { data } = await worker.recognize(processed);
    await worker.terminate();
    return data.text.trim().replace(/\s/g, "").slice(0, 6);
  } catch {
    return "";
  }
}

function extractCaptchaUrl(html: string, base: string): string | null {
  // tenta vários padrões
  const m1 = html.match(/src=["']([^"']*captcha[^"']*)["']/i);
  if (m1) {
    const src = m1[1];
    if (src.startsWith("http")) return src;
    if (src.startsWith("/")) return base + src;
    return base + "/" + src;
  }
  const m2 = html.match(/CaptchaImage\.aspx\?guid=[a-f0-9-]+/i);
  if (m2) return base + "/SCM/extra/" + m2[0];
  return null;
}

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const chave = processo.nup ?? processo.numero;
  if (!chave) return NextResponse.json({ error: "Processo sem NUP ou número" }, { status: 400 });

  const baseSei = "https://sei.anm.gov.br";
  const urlPesquisa = `${baseSei}/sei/modulos/pesquisa/md_pesq_processo_pesquisar.php?acao_externa=protocolo_pesquisar&acao_origem_externa=protocolo_pesquisar&id_orgao_acesso_externo=0`;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const getRes = await fetch(urlPesquisa, { headers: { "User-Agent": "Mozilla/5.0" } });
      const cookies = getRes.headers.get("set-cookie") ?? "";
      const html = await getRes.text();

      // tenta achar captcha
      const captchaUrl = extractCaptchaUrl(html, baseSei);
      let codigo = "";
      if (captchaUrl) {
        const capRes = await fetch(captchaUrl, { headers: { Cookie: cookies, "User-Agent": "Mozilla/5.0" } });
        const buf = Buffer.from(await capRes.arrayBuffer());
        codigo = await solveCaptcha(buf);
        if (!codigo) continue;
      } else {
        // sem captcha visível, tenta direto (alguns ambientes não exigem)
        codigo = "";
      }

      // extrai campos hidden do SEI (infra params)
      const infraCaptcha = html.match(/name="infraCaptcha"[^>]*value="([^"]*)"/)?.[1] ?? "";
      const infraHash = html.match(/name="infraHash"[^>]*value="([^"]*)"/)?.[1] ?? "";

      const body = new URLSearchParams({
        txtProtocolo: chave,
        txtUnidade: "",
        chkSinProcessos: "on",
        chkSinDocumentos: "on",
        infraCaptcha: codigo,
        infraHash: infraHash,
      });

      const postRes = await fetch(urlPesquisa, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies, "User-Agent": "Mozilla/5.0" },
        body: body.toString(),
      });
      const postHtml = await postRes.text();

      if (postHtml.includes("captcha") && postHtml.includes("Código")) {
        continue; // captcha errado, tenta de novo
      }

      // extrai andamentos
      const andamentos: { data: string; descricao: string }[] = [];
      const regex = /(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*([^<]{10,300})/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(postHtml)) !== null && andamentos.length < 20) {
        andamentos.push({ data: m[1], descricao: m[2].trim().replace(/<[^>]+>/g, "").slice(0, 300) });
      }

      // fallback: procura por tabela de andamentos
      if (andamentos.length === 0 && postHtml.includes("Andamento")) {
        // tenta extrair linhas de tabela
        const rows = [...postHtml.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/g)];
        for (const r of rows) {
          if (/\d{2}\/\d{2}\/\d{4}/.test(r[1])) andamentos.push({ data: r[1].trim(), descricao: r[2].trim().slice(0, 300) });
          if (andamentos.length >= 20) break;
        }
      }

      if (andamentos.length === 0) {
        // sem andamentos mas página carregou -> pode ser sem resultados
        if (postHtml.includes("Nenhum") || postHtml.includes("não encontrado")) {
          return NextResponse.json({ ok: false, modo: "sem_resultados", mensagem: `Nenhum andamento público para ${chave}`, chave, tentativa });
        }
        continue;
      }

      let criados = 0;
      for (const a of andamentos) {
        const [d, mo, y] = a.data.split("/").map(Number);
        const data = new Date(y, mo - 1, d);
        const jaExiste = await prisma.evento.findFirst({
          where: { processoId, descricao: a.descricao, data: { gte: new Date(data.getTime() - 1000), lte: new Date(data.getTime() + 1000) } },
        });
        if (jaExiste) continue;
        const tipo = await prisma.tipoEvento.findFirst({ where: { ativo: true } });
        if (!tipo) continue;
        await prisma.evento.create({ data: { processoId, tipoEventoId: tipo.id, descricao: a.descricao, data } });
        criados++;
      }

      return NextResponse.json({ ok: true, modo: "tesseract", tentativa, andamentos, criados, chave });
    } catch (e) {
      if (tentativa === 3) return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro SEI", chave }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: false,
    modo: "captcha_falhou",
    mensagem: "Não foi possível resolver o captcha do SEI após 3 tentativas. Tente novamente ou importe o PDF do andamento manualmente.",
    chave,
  }, { status: 422 });
}
