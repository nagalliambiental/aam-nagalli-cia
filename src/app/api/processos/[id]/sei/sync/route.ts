import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const chave = processo.nup ?? processo.numero;
  if (!chave) return NextResponse.json({ error: "Processo sem NUP ou número para consulta" }, { status: 400 });

  // Tentativa de consulta pública SEI (sem credencial) — scraping da Pesquisa Pública
  // O SEI exige captcha na pesquisa pública, então a sincronização automática completa
  // requer credenciamento WebService. Aqui fazemos uma tentativa de fetch e, se falhar,
  // orientamos o usuário.
  try {
    const url = "https://sei.anm.gov.br/sei/modulos/pesquisa/md_pesq_processo_pesquisar.php?acao_externa=protocolo_pesquisar&acao_origem_externa=protocolo_pesquisar&id_orgao_acesso_externo=0";
    const body = new URLSearchParams({
      txtProtocolo: chave.replace(/\D/g, "").slice(-10), // tenta com 10 dígitos
      txtUnidade: "",
      chkSinProcessos: "on",
      chkSinDocumentos: "on",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const html = await res.text();

    // Verifica se retornou captcha ou lista vazia
    if (html.includes("captcha") || html.includes("Código") || html.length < 500) {
      return NextResponse.json({
        ok: false,
        modo: "publico_limitado",
        mensagem: "A Pesquisa Pública do SEI exige captcha. Para sincronização automática sem interação, é necessário credenciar o sistema no SEI Web Services (controlador_ws.php). Por enquanto, verifique manualmente no SEI e importe o PDF do andamento.",
        chave,
        htmlPreview: html.slice(0, 1000),
      });
    }

    // Tenta extrair andamentos simples: procura por datas e descrições
    const andamentos: { data: string; descricao: string }[] = [];
    const regex = /(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*([^<]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null && andamentos.length < 20) {
      andamentos.push({ data: m[1], descricao: m[2].trim().slice(0, 300) });
    }

    if (andamentos.length === 0) {
      return NextResponse.json({
        ok: false,
        modo: "publico_sem_resultados",
        mensagem: `Nenhum andamento público encontrado para ${chave}. O SEI pode estar com o processo restrito ou exigir captcha.`,
        chave,
      });
    }

    // Cria Eventos para andamentos novos (evita duplicar)
    let criados = 0;
    for (const a of andamentos) {
      const [d, mo, y] = a.data.split("/").map(Number);
      const data = new Date(y, mo - 1, d);
      const jaExiste = await prisma.evento.findFirst({
        where: { processoId, descricao: a.descricao, data: { gte: new Date(data.getTime() - 1000), lte: new Date(data.getTime() + 1000) } },
      });
      if (jaExiste) continue;
      // precisa tipoEventoId — usa o primeiro tipo
      const tipo = await prisma.tipoEvento.findFirst({ where: { ativo: true } });
      if (!tipo) continue;
      await prisma.evento.create({
        data: { processoId, tipoEventoId: tipo.id, descricao: a.descricao, data },
      });
      criados++;
    }

    return NextResponse.json({ ok: true, modo: "publico_scraping", andamentos, criados, chave });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro ao consultar SEI", chave }, { status: 500 });
  }
}
