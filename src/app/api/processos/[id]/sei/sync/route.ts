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

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const chave = processo.nup ?? processo.numero;
  if (!chave) return NextResponse.json({ error: "Processo sem NUP ou número" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const codigoManual = (body.codigo as string ?? "").trim();

  const baseSei = "https://sei.anm.gov.br";
  const urlPesquisa = `${baseSei}/sei/modulos/pesquisa/md_pesq_processo_pesquisar.php?acao_externa=protocolo_pesquisar&acao_origem_externa=protocolo_pesquisar&id_orgao_acesso_externo=0`;

  // Se veio código manual, faz consulta direta
  if (codigoManual) {
    try {
      const getRes = await fetch(urlPesquisa, { headers: { "User-Agent": "Mozilla/5.0" } });
      const cookies = getRes.headers.get("set-cookie") ?? "";
      const html = await getRes.text();
      const infraHash = html.match(/name="infraHash"[^>]*value="([^"]*)"/)?.[1] ?? "";
      const postBody = new URLSearchParams({
        txtProtocolo: chave,
        txtUnidade: "",
        chkSinProcessos: "on",
        chkSinDocumentos: "on",
        infraCaptcha: codigoManual,
        infraHash,
      });
      const postRes = await fetch(urlPesquisa, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies, "User-Agent": "Mozilla/5.0" },
        body: postBody.toString(),
      });
      const postHtml = await postRes.text();
      if (postHtml.includes("captcha") && postHtml.includes("Código")) {
        return NextResponse.json({ ok: false, error: "Código incorreto." }, { status: 422 });
      }
      const andamentos: { data: string; descricao: string }[] = [];
      const regex = /(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*([^<]{10,300})/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(postHtml)) !== null && andamentos.length < 20) {
        andamentos.push({ data: m[1], descricao: m[2].trim().replace(/<[^>]+>/g, "").slice(0, 300) });
      }
      if (andamentos.length === 0) {
        return NextResponse.json({ ok: false, modo: "sem_resultados", mensagem: `Nenhum andamento para ${chave}`, chave });
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
      return NextResponse.json({ ok: true, andamentos, criados, chave });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro SEI" }, { status: 500 });
    }
  }

  // Sem código: retorna captcha para digitação manual (evita Tesseract e timeout)
  try {
    const getRes = await fetch(urlPesquisa, { headers: { "User-Agent": "Mozilla/5.0" } });
    const cookies = getRes.headers.get("set-cookie") ?? "";
    const html = await getRes.text();
    const captchaUrl = extractCaptchaUrl(html, baseSei);
    if (captchaUrl) {
      const capRes = await fetch(captchaUrl, { headers: { Cookie: cookies, "User-Agent": "Mozilla/5.0" } });
      const buf = Buffer.from(await capRes.arrayBuffer());
      const base64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
      return NextResponse.json({ ok: false, modo: "captcha_manual", mensagem: "Digite o código da imagem para ver movimentações.", chave, captchaBase64: base64 }, { status: 422 });
    }
  } catch {}
  return NextResponse.json({ ok: false, modo: "captcha_falhou", mensagem: "Não foi possível carregar captcha. Tente novamente.", chave }, { status: 422 });
}
