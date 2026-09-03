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

  const tarefas = await prisma.tarefa.findMany({
    where: { ativo: true, deletedAt: null, status: { notIn: ["concluida"] }, processo: procWhere },
    orderBy: { prazoData: "asc" },
    include: { processo: { include: { empreendimento: { include: { empresaPrincipal: true } } } } },
  });

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
  const vencidas = tarefas.filter((x) => {
    const fim = x.dataLimite ?? x.prazoData;
    return fim && new Date(fim) < hoje;
  });
  const proximas = tarefas.filter((x) => {
    const fim = x.dataLimite ?? x.prazoData;
    if (!fim) return false;
    const dias = x.dataLimite ? (x.alertaDataLimite ?? 30) : (x.alertaDias ?? 30);
    return new Date(fim).getTime() - dias * UM_DIA <= hoje.getTime() && new Date(fim) >= hoje;
  });

  return (
    <div>
      <PageHeader title="Prazos & Calendário" subtitle="Linha do tempo de processos por cliente e empreendimento" />
      <GanttPrazos barras={barras} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-navy-900">Tarefas e prazos</div>
          <ul className="divide-y divide-slate-100">
            {tarefas.map((x) => {
              const fim = x.dataLimite ?? x.prazoData;
              return (
                <li key={x.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{x.titulo}</p>
                    <p className="text-xs text-muted">
                      {x.processo ? `Processo ${x.processo.numero}` : "Sem processo"}
                      {fim ? ` · Data Limite ${formatDate(new Date(fim))}` : ""}
                    </p>
                  </div>
                  <Badge tone={x.status === "concluida" ? "green" : x.status === "em_andamento" ? "blue" : "amber"}>
                    {x.status === "concluida" ? "Concluída" : x.status === "em_andamento" ? "Iniciada" : "Pendente"}
                  </Badge>
                </li>
              );
            })}
            {tarefas.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Nenhuma tarefa em aberto.</li>}
          </ul>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-navy-900">Alertas</div>
          <ul className="divide-y divide-slate-100">
            {vencidas.map((x) => (
              <li key={x.id} className="px-5 py-3 text-sm text-navy-900"><Badge tone="red">vencida</Badge> {x.titulo} {x.processo ? `· ${x.processo.numero}` : ""}</li>
            ))}
            {proximas.map((x) => (
              <li key={x.id} className="px-5 py-3 text-sm text-navy-900"><Badge tone="amber">próx. do venc.</Badge> {x.titulo} {x.processo ? `· ${x.processo.numero}` : ""} — até {formatDate(new Date(x.dataLimite ?? x.prazoData!))}</li>
            ))}
            {(vencidas.length === 0 && proximas.length === 0) && <li className="px-5 py-8 text-center text-sm text-muted">Tudo em dia. Nenhum alerta de prazo.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
