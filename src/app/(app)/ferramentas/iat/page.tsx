import { PageHeader, Card } from "@/components/ui";
import { requirePermissao, requireAuth } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";
import { FONTE_LEGISLACAO_IAT } from "@/lib/legislacao-iat";
import { LegislacaoIatPainel, type LegislacaoIatLinha } from "@/components/ferramentas/LegislacaoIatPainel";
import { LegislacaoIatSincronizar } from "@/components/ferramentas/LegislacaoIatSincronizar";

export const dynamic = "force-dynamic";

export default async function LegislacaoIatPage() {
  await requirePermissao("processo:ler");
  const user = await requireAuth();
  const podeSincronizar = user.permissoes?.includes("processo:editar") ?? false;

  let itens: LegislacaoIatLinha[] = [];
  let ultimaVerificacao: string | null = null;
  try {
    const registros = await prisma.legislacaoIat.findMany({ orderBy: [{ ano: "desc" }, { numero: "desc" }] });
    itens = registros.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      numero: r.numero,
      ano: r.ano,
      titulo: r.titulo,
      ementa: r.ementa,
      url: r.url,
      anexosUrl: r.anexosUrl,
      situacao: r.situacao,
      revogadaPor: r.revogadaPor,
      criadoEm: r.criadoEm.toISOString(),
      atualizadoEm: r.atualizadoEm.toISOString(),
    }));
    const verificacao = registros.reduce<string | null>((max, r) => {
      const iso = r.ultimaVerificacao.toISOString();
      return !max || iso > max ? iso : max;
    }, null);
    ultimaVerificacao = verificacao;
  } catch {
    itens = [];
  }

  return (
    <div>
      <PageHeader
        title="Legislação IAT"
        subtitle="Instruções Normativas e Orientações Técnicas do Instituto Água e Terra — vigentes e revogadas, com atualização automática diária"
        actions={podeSincronizar ? <LegislacaoIatSincronizar /> : undefined}
      />

      {itens.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">
            Nenhuma norma carregada ainda. Use <strong>Sincronizar agora</strong> para importar as Instruções Normativas e
            Orientações Técnicas publicadas no site do IAT — a partir daí o cron diário mantém tudo atualizado.
          </p>
        </Card>
      ) : (
        <LegislacaoIatPainel itens={itens} fonteUrl={FONTE_LEGISLACAO_IAT} ultimaVerificacao={ultimaVerificacao} />
      )}
    </div>
  );
}
