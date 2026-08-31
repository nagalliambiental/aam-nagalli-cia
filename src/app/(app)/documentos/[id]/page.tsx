import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermissao } from "@/lib/perfil";
import { notFound } from "next/navigation";
import { Card, CardHeader, PageHeader, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";

function formatBytes(n?: number | null) {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = n;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export default async function DocumentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const docId = Number(id);
  await requirePermissao("documento:ler");

  const doc = await prisma.documento.findFirst({
    where: { id: docId, ativo: true, deletedAt: null },
    include: { responsavel: true },
  });
  if (!doc) notFound();
  const isUrl = doc.storageKey.startsWith("http");

  return (
    <div>
      <PageHeader
        title={doc.nome}
        subtitle={`v${doc.versao} · ${doc.tipo}${doc.categoria !== "documento" ? ` · ${doc.categoria}` : ""}`}
        actions={
          <>
            <Link href="/documentos">
              <Button variant="ghost">Voltar</Button>
            </Link>
            {isUrl && (
              <a href={doc.storageKey} target="_blank" rel="noreferrer">
                <Button>Abrir / baixar</Button>
              </a>
            )}
          </>
        }
      />

      <Card>
        <CardHeader title="Detalhes" />
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm md:grid-cols-2">
          {[
            ["Arquivo", doc.nome],
            ["Tipo", doc.tipo],
            ["Categoria", doc.categoria],
            ["Versão", `v${doc.versao}`],
            ["Tamanho", formatBytes(doc.tamanho ?? undefined)],
            ["MIME", doc.mime ?? "—"],
            ["Data", formatDate(doc.data)],
            ["Responsável", doc.responsavel?.nome ?? "—"],
            ["Origem", doc.origem],
            ["Status", doc.status],
            ["SHA-256", doc.hash ? doc.hash.slice(0, 16) + "…" : "—"],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium break-all">{v}</dd>
            </div>
          ))}
        </dl>
        {doc.observacoes && (
          <div className="border-t border-slate-200 px-5 py-4 text-sm">
            <dt className="text-muted">Observações</dt>
            <dd className="mt-1 whitespace-pre-wrap">{doc.observacoes}</dd>
          </div>
        )}
        {!isUrl && (
          <div className="border-t border-slate-200 px-5 py-4 text-sm text-amber-700">
            Arquivo não disponível para download (storage não configurado).
          </div>
        )}
      </Card>
    </div>
  );
}
