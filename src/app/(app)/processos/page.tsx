import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button } from "@/components/ui";
import { ProcessosFiltro } from "@/components/processos/ProcessosFiltro";
import { ImportarProcessos } from "@/components/processos/ImportarProcessos";
import { filtroSegregacao, filtroProcesso } from "@/lib/segregacao";
import { usuarioTemPermissao } from "@/lib/perfil";

export default async function ProcessosPage() {
  const { scoped, responsavelPessoaId } = await filtroSegregacao();
  const podeExcluir = await usuarioTemPermissao("processo:excluir");
  const podeCriar = await usuarioTemPermissao("processo:criar");

  const processos = await prisma.processo.findMany({
    where: {
      ativo: true,
      deletedAt: null,
      ...filtroProcesso(scoped, responsavelPessoaId),
    },
    orderBy: { dataAbertura: "desc" },
    select: {
      id: true,
      numero: true,
      apelido: true,
      nup: true,
      natureza: true,
      fase: true,
      modalidade: true,
      numeroLicenca: true,
      substancias: true,
      status: true,
      validade: true,
      dataLimiteRenovacao: true,
      dataProtocolo: true,
      dataAbertura: true,
      orgao: { select: { sigla: true } },
      responsavel: { select: { nome: true } },
      empreendimento: { select: { id: true, nome: true, apelido: true } },
      _count: { select: { eventos: true, prazos: true, tarefas: true } },
      notificacoes: { where: { tipo: "sei_movimentacao", lida: false }, select: { id: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Processos"
        subtitle="Hub operacional: processos minerários e ambientais"
        actions={
          podeCriar ? (
            <div className="flex items-center gap-2">
              <ImportarProcessos />
              <Link href="/api/relatorios/processos/xlsx" target="_blank" rel="noreferrer">
                <Button variant="secondary">Exportar XLSX</Button>
              </Link>
              <Link href="/api/relatorios/processos/pdf" target="_blank" rel="noreferrer">
                <Button variant="secondary">Exportar PDF</Button>
              </Link>
              <Link href="/api/relatorios/processos/modelo" target="_blank" rel="noreferrer">
                <Button variant="ghost">Modelo</Button>
              </Link>
              <Link href="/processos/novo">
                <Button>Novo processo</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <ProcessosFiltro processos={processos} podeExcluir={podeExcluir} />
    </div>
  );
}
