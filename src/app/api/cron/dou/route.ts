import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarDouTermo, dataOntemDmy } from "@/lib/dou";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const MAX_TERMOS = 24;

function autorizado(req: Request): boolean {
  if (!CRON_SECRET) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${CRON_SECRET}`;
}

type Termo = { text: string; tipo: "empresa" | "empreendimento" | "processo"; id: number };

/**
 * Cron diário (07h BR): busca no DOU do DIA ANTERIOR as publicações que citem
 * os processos, empreendimentos e clientes (empresas) cadastrados, e cria uma
 * notificação no sistema (Dashboard/sino) para cada publicação nova.
 */
export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const data = dataOntemDmy();

  const [empresas, empreendimentos, processos] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, cnpj: true, razaoSocial: true, nomeFantasia: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true, apelido: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, numero: true, nup: true } }),
  ]);

  const termos: Termo[] = [];
  for (const e of empresas) {
    if (e.cnpj) termos.push({ text: e.cnpj.replace(/\D/g, ""), tipo: "empresa", id: e.id });
    if (e.razaoSocial) termos.push({ text: e.razaoSocial, tipo: "empresa", id: e.id });
    if (e.nomeFantasia) termos.push({ text: e.nomeFantasia, tipo: "empresa", id: e.id });
  }
  for (const emp of empreendimentos) {
    termos.push({ text: emp.nome, tipo: "empreendimento", id: emp.id });
    if (emp.apelido) termos.push({ text: emp.apelido, tipo: "empreendimento", id: emp.id });
  }
  for (const p of processos) {
    termos.push({ text: p.nup ?? "", tipo: "processo", id: p.id });
    termos.push({ text: p.numero, tipo: "processo", id: p.id });
  }
  // Limita a quantidade de buscas (Vercel Hobby: máx 60s).
  const termosResumo = termos.filter((t) => t.text.trim()).slice(0, MAX_TERMOS);

  let notificacoes = 0;
  const vistos = new Set<string>();
  const detalhes: string[] = [];

  for (const t of termosResumo) {
    const resultados = await buscarDouTermo(t.text, data).catch(() => []);
    for (const r of resultados) {
      if (!r.id || vistos.has(r.id)) continue; // mesma publicação citada por vários termos
      vistos.add(r.id);
      const jaNotificado = await prisma.notificacao.findFirst({
        where: {
          tipo: "dou_notificacao",
          mensagem: `DOU ${r.secao} (${r.titulo})`,
          lida: false,
        },
      });
      if (jaNotificado) continue;
      await prisma.notificacao.create({
        data: {
          tipo: "dou_notificacao",
          mensagem: `DOU ${r.secao}: ${r.titulo}`,
          processoId: t.tipo === "processo" ? t.id : undefined,
          destinatarioUsuarioId: null,
        },
      });
      notificacoes++;
      detalhes.push(`${r.secao} | ${r.titulo}`);
    }
  }

  return NextResponse.json({ ok: true, data, termos: termosResumo.length, notificacoes, detalhes: detalhes.slice(0, 20) });
}
