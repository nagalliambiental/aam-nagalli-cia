import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { PageHeader, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermissao("config:ler");

  const sp = await searchParams;
  const tipoEntidade = typeof sp.tipo === "string" ? Number(sp.tipo) : undefined;
  const usuarioId = typeof sp.usuario === "string" ? Number(sp.usuario) : undefined;
  const acao = typeof sp.acao === "string" ? sp.acao : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where = {
    ...(tipoEntidade ? { tipoEntidadeId: tipoEntidade } : {}),
    ...(usuarioId ? { usuarioId } : {}),
    ...(acao ? { acao } : {}),
    ...(q
      ? {
          OR: [
            { acao: { contains: q, mode: "insensitive" as const } },
            { campo: { contains: q, mode: "insensitive" as const } },
            { valorNovo: { contains: q, mode: "insensitive" as const } },
            { valorAnterior: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tipos, usuarios, historico] = await Promise.all([
    prisma.tipoEntidade.findMany({ orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({ orderBy: { email: "asc" } }),
    prisma.historico.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      take: 300,
      include: { tipoEntidade: true, usuario: true },
    }),
  ]);

  const acoes = [...new Set(await prisma.historico.findMany({ select: { acao: true }, distinct: ["acao"] }).then((r) => r.map((x) => x.acao)))].sort();

  const select =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20";

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Histórico imutável de alterações" />

      <Card>
        <form method="get" className="flex items-center gap-2 border-b border-slate-200 p-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por ação, campo ou valor..."
            className="w-full rounded-md border border-slate-300 bg-white py-2 px-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
          <button type="submit" className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">Buscar</button>
        </form>
        <form method="get" className="grid grid-cols-1 gap-3 p-5 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900">Entidade</label>
            <select name="tipo" className={select}>
              <option value="">(todas)</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id} selected={tipoEntidade === t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900">Usuário</label>
            <select name="usuario" className={select}>
              <option value="">(todos)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id} selected={usuarioId === u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900">Ação</label>
            <select name="acao" className={select}>
              <option value="">(todas)</option>
              {acoes.map((a) => (
                <option key={a} value={a} selected={acao === a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              Filtrar
            </button>
            <a
              href="/auditoria"
              className="rounded-md px-4 py-2 text-sm font-medium text-navy-900 hover:bg-slate-100"
            >
              Limpar
            </a>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <Card>
          <ul className="divide-y divide-slate-100">
            {historico.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-navy-900">
                    <span className="font-medium">{h.usuario?.email ?? "—"}</span>{" "}
                    <span className="text-muted">
                      {h.acao} em {h.tipoEntidade.nome}
                      {h.entidadeId != null ? ` (#${h.entidadeId})` : ""}
                    </span>
                  </p>
                  {(h.campo || h.valorNovo || h.valorAnterior) && (
                    <p className="mt-0.5 text-xs text-muted">
                      {h.campo && <span className="font-medium">{h.campo}: </span>}
                      {h.valorAnterior != null && <s>{h.valorAnterior}</s>}
                      {h.valorAnterior != null && h.valorNovo != null && " → "}
                      {h.valorNovo != null && h.valorNovo}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted">{formatDate(h.criadoEm)}</span>
              </li>
            ))}
            {historico.length === 0 && (
              <li className="px-5 py-12 text-center text-sm text-muted">
                Nenhum registro de auditoria encontrado.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
