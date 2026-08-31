import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card } from "@/components/ui";
import { Users, ShieldCheck, UserCog, ArrowRight, Workflow, History } from "lucide-react";

export default async function ConfigPage() {
  await requirePermissao("config:ler");

  const [usuarios, perfis, auditoria, regras] = await Promise.all([
    prisma.usuario.count({ where: { ativo: true } }),
    prisma.perfil.count({ where: { ativo: true } }),
    prisma.historico.count(),
    prisma.regraPrazo.count({ where: { ativo: true } }),
  ]);

  const cards = [
    {
      href: "/usuarios",
      icon: Users,
      title: "Usuários",
      desc: "Criar, editar e gerenciar acessos de usuários",
      badge: `${usuarios} ativos`,
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      href: "/perfis",
      icon: ShieldCheck,
      title: "Perfis de acesso",
      desc: "Configurar permissões por perfil (módulos e ações)",
      badge: `${perfis} perfis`,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/regras-prazo",
      icon: Workflow,
      title: "Regras de prazo",
      desc: "Configure fórmulas e calculadoras de prazos por tipo de ato",
      badge: `${regras} regras`,
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      href: "/auditoria",
      icon: History,
      title: "Auditoria",
      desc: "Histórico de ações realizadas no sistema",
      badge: `${auditoria.toLocaleString("pt-BR")} registros`,
      iconBg: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Usuários, permissões, regras de prazo e auditoria do sistema"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}>
              <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">
                    {c.badge}
                  </span>
                </div>
                <h2 className="mt-4 flex items-center gap-1 text-base font-semibold text-navy-900">
                  {c.title}
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-navy-600" />
                </h2>
                <p className="mt-1 text-sm text-muted">{c.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-3 p-5">
          <UserCog className="h-5 w-5 text-navy-700" />
          <p className="text-sm text-muted">
            Os acessos são controlados por permissões no formato{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">modulo:acao</code>{" "}
            (ex.: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">processo:editar</code>).
            Cada perfil define quais permissões seus usuários possuem.
          </p>
        </div>
      </Card>
    </div>
  );
}
