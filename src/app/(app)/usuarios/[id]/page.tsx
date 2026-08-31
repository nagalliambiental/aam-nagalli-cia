import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { UserCog, KeyRound } from "lucide-react";

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuarioId = Number(id);
  await requirePermissao("usuario:ler");

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { perfil: { include: { permissoes: { include: { permissao: true } } } }, pessoa: true },
  });
  if (!usuario) notFound();

  return (
    <div>
      <PageHeader
        title={usuario.pessoa?.nome ?? usuario.email}
        subtitle={usuario.email}
        actions={
          <>
            <Link href="/usuarios">
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/usuarios/${usuario.id}/editar`}>
              <Button>Editar</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <div className="px-5 py-4">
              <h2 className="mb-3 text-sm font-semibold text-navy-900">Informações</h2>
              <dl className="space-y-2 text-sm">
                {[
                  ["E-mail", usuario.email],
                  ["Pessoa vinculada", usuario.pessoa?.nome ?? "—"],
                  ["Perfil", usuario.perfil.nome],
                  ["Status", usuario.ativo ? "Ativo" : "Inativo"],
                  ["Criado em", usuario.criadoEm.toLocaleDateString("pt-BR")],
                  ["Último acesso", usuario.ultimoLoginEm ? usuario.ultimoLoginEm.toLocaleString("pt-BR") : "Nunca"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4">
                {usuario.ativo ? (
                  <Badge tone="green">Acesso liberado</Badge>
                ) : (
                  <Badge tone="red">Acesso bloqueado</Badge>
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <KeyRound className="h-4 w-4" /> Permissões do perfil ({usuario.perfil.nome})
            </h2>
            <Badge tone="blue">{usuario.perfil.permissoes.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 p-5">
            {usuario.perfil.permissoes.map((pp) => (
              <Badge key={pp.permissao.chave} tone="gray">{pp.permissao.chave}</Badge>
            ))}
            {usuario.perfil.permissoes.length === 0 && (
              <p className="text-sm text-muted">Nenhuma permissão configurada.</p>
            )}
          </div>
          <div className="border-t border-slate-100 px-5 py-4">
            <Link href={`/perfis/${usuario.perfilId}/editar`}>
              <Button variant="secondary">Gerenciar permissões deste perfil</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
