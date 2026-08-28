import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Badge } from "@/components/ui";

export default async function DashboardPage() {
  const [empresas, processos, orgaos, tarefasPendentes, prazosAbertos] =
    await Promise.all([
      prisma.empresa.count({ where: { ativo: true, deletedAt: null } }),
      prisma.processo.count({ where: { ativo: true, deletedAt: null } }),
      prisma.orgao.count({ where: { ativo: true } }),
      prisma.tarefa.count({ where: { status: "pendente", ativo: true, deletedAt: null } }),
      prisma.prazo.count({
        where: {
          ativo: true,
          deletedAt: null,
          status: { in: ["futuro", "proximo", "vencendo"] },
        },
      }),
    ]);

  const cards = [
    { label: "Empresas", value: empresas, href: "/empresas" },
    { label: "Processos", value: processos, href: "/processos" },
    { label: "Órgãos", value: orgaos, href: "/orgaos" },
    { label: "Tarefas pendentes", value: tarefasPendentes, href: "/tarefas" },
    { label: "Prazos abertos", value: prazosAbertos, href: "/prazos" },
  ];

  return (
    <div>
      <PageHeader
        title="Painel"
        subtitle="Visão geral do sistema de gestão ambiental e mineral"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-5 transition hover:shadow-md">
              <p className="text-sm text-muted">{c.label}</p>
              <p className="mt-2 text-3xl font-bold text-navy-900">{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Badge tone="gold">Sistema</Badge>
            <p className="text-sm text-muted">
              Módulos de Processo (hub), Empresas e Órgãos disponíveis. Demais
              entidades em implantação progressiva.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
