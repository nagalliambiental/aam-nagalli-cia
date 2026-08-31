import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { ShieldCheck, Users, KeyRound } from "lucide-react";

export default async function PerfilDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfilId = Number(id);
  await requirePermissao("config:ler");

  const perfil = await prisma.perfil.findUnique({
    where: { id: perfilId },
    include: {
      usuarios: { include: { pessoa: true } },
      permissoes: { include: { permissao: true } },
    },
  });
  if (!perfil) notFound();

  const porModulo = perfil.permissoes.reduce<Record<string, string[]>>((acc, pp) => {
    (acc[pp.permissao.modulo] ??= []).push(pp.permissao.acao);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title={perfil.nome}
        subtitle={perfil.descricao ?? "Perfil de acesso"}
        actions={
          <>
            <Link href="/perfis">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/perfis/${perfil.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <ShieldCheck className="h-4 w-4 text-navy-700" />
            <h2 className="text-sm font-semibold text-navy-900">Permissões</h2>
            <span className="ml-auto text-xs text-muted">{perfil.permissoes.length}</span>
          </div>
          <div className="space-y-3 p-5">
            {Object.entries(porModulo).map(([modulo, acoes]) => (
              <div key={modulo} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold capitalize text-navy-900">{modulo}</span>
                <div className="flex flex-wrap gap-1.5">
                  {acoes.map((a) => (
                    <Badge key={a} tone="gray">{a}</Badge>
                  ))}
                </div>
              </div>
            ))}
            {perfil.permissoes.length === 0 && (
              <p className="text-sm text-muted">Nenhuma permissão configurada.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Users className="h-4 w-4 text-navy-700" />
            <h2 className="text-sm font-semibold text-navy-900">Usuários com este perfil</h2>
            <span className="ml-auto text-xs text-muted">{perfil.usuarios.length}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {perfil.usuarios.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <Link href={`/usuarios/${u.id}`} className="text-sm font-medium text-navy-900 hover:underline">
                  {u.pessoa?.nome ?? u.email}
                </Link>
                <div className="flex items-center gap-2">
                  {u.ativo ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}
                </div>
              </li>
            ))}
            {perfil.usuarios.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Nenhum usuário com este perfil.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
