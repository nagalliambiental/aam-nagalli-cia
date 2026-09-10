import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarDouTermo, dataOntemDmy } from "@/lib/dou";
import { montarTermosDou } from "@/lib/dou-termos";

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

  const [empresas, empreendimentos, processos, config] = await Promise.all([
    prisma.empresa.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, cnpj: true, cpf: true, razaoSocial: true, nomeFantasia: true } }),
    prisma.empreendimento.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, nome: true, apelido: true } }),
    prisma.processo.findMany({ where: { ativo: true, deletedAt: null }, select: { id: true, numero: true, nup: true } }),
    prisma.douConfiguracao.findUnique({ where: { id: 1 } }),
  ]);
  const automaticos = montarTermosDou(empresas, empreendimentos, processos, []).map((t) => ({ text: t.text, tipo: t.origem, id: t.id ?? 0 }));
  const extras = (config?.termosExtras ?? "").split(/\r?\n/).map((text) => text.trim()).filter(Boolean).map((text) => ({ text, tipo: "manual", id: 0 }));
  const termosResumo = [...extras, ...automaticos].slice(0, MAX_TERMOS);

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
          mensagem: `DOU ${r.secao}: ${r.titulo} (termo: ${t.text})`,
          url: r.url || null,
          termo: `${t.tipo}:${t.text}`,
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
