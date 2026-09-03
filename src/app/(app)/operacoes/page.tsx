import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card, Badge } from "@/components/ui";
import { GanttPrazos } from "@/components/processos/GanttPrazos";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";
import { formatDate } from "@/lib/format";

export default async function OperacoesPage() {
  await requirePermissao("processo:ler");
  const { scoped, responsavelPessoaId } = await filtroSegregacao();
  const procWhere = { ativo: true, deletedAt: null, ...filtroProcesso(scoped, responsavelPessoaId) };

  const [tarefas, prazos] = await Promise.all([
    prisma.tarefa.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["concluida"] }, processo: procWhere },
      orderBy: { prazoData: "asc" },
      include: { processo: { include: { empreendimento: { include: { empresaPrincipal: true } } } } },
    }),
    prisma.prazo.findMany({
      where: { ativo: true, deletedAt: null, status: { notIn: ["concluido", "cancelado"] }, processo: procWhere },
      orderBy: { dataCalculadaAtual: "asc" },
      select: { id: true, descricao: true, status: true, dataCalculadaAtual: true, alertaDias: true, processo: { select: { numero: true } } },
    }),
  ]);

  const UM_DIA = 86400000;
  const barras = tarefas.map((t) => {
    const fim = t.prazoData ?? t.dataLimite ?? new Date(t.dataCriacao.getTime() + 30 * UM_DIA);
    const cliente = t.processo?.empreendimento?.empresaPrincipal
      ? (t.processo.empreendimento.empresaPrincipal.nomeFantasia || t.processo.empreendimento.empresaPrincipal.razaoSocial)
      : "Sem cliente";
    const empreendimento = t.processo?.empreendimento ? (t.processo.empreendimento.apelido || t.processo.empreendimento.nome) : "Sem empreendimento";
    const titulo = t.processo ? `Processo #${t.processo.numero} | ${t.titulo}` : t.titulo;
    return { id: t.id, titulo, iniMs: t.dataCriacao.getTime(), fimMs: fim.getTime(), natureza: t.processo?.natureza ?? "minerario", status: t.status, cliente, empreendimento };
  });

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const vencidos = prazos.filter((x) => x.dataCalculadaAtual && new Date(x.dataCalculadaAtual) < hoje);
  const dentroAlerta = prazos.filter((x) => {
    if (!x.dataCalculadaAtual) return false;
    const dias = x.alertaDias ?? 30;
    return new Date(x.dataCalculadaAtual).getTime() - dias * UM_DIA <= hoje.getTime();
  });

  return (
    <div>
      <PageHeader title="Prazos & Calendário" subtitle="Linha do tempo de processos por cliente e empreendimento" />
      <GanttPrazos barras={barras} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-navy-900">Prazos em aberto</div>
          <ul className="divide-y divide-slate-100">
            {prazos.map((x) => (
              <li key={x.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{x.descricao}</p>
                  <p className="text-xs text-muted">{x.processo ? `Processo ${x.processo.numero}` : "Sem processo"} {x.dataCalculadaAtual ? `· até ${formatDate(x.dataCalculadaAtual)}` : ""}</p>
                </div>
                <Badge tone={x.status === "vencido" ? "red" : x.status === "vencendo" ? "amber" : "blue"}>{x.status}</Badge>
              </li>
            ))}
            {prazos.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Nenhum prazo em aberto.</li>}
          </ul>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-navy-900">Alertas</div>
          <ul className="divide-y divide-slate-100">
            {vencidos.map((x) => (
              <li key={x.id} className="px-5 py-3 text-sm text-navy-900"><Badge tone="red">vencido</Badge> {x.descricao} {x.processo ? `· ${x.processo.numero}` : ""}</li>
            ))}
            {dentroAlerta.map((x) => (
              <li key={x.id} className="px-5 py-3 text-sm text-navy-900"><Badge tone="amber">próx. do venc.</Badge> {x.descricao} {x.processo ? `· ${x.processo.numero}` : ""} — até {x.dataCalculadaAtual ? formatDate(x.dataCalculadaAtual) : "—"}</li>
            ))}
            {vencidos.length === 0 && dentroAlerta.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Tudo em dia. Nenhum alerta de prazo.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
