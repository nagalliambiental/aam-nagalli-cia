import { PageHeader, Card, Button } from "@/components/ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatBytes, formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function BackupPage() {
  const session = await auth();
  if (session?.user?.perfilNome !== "Administrador") redirect("/");
  const backups = await prisma.backupArquivo.findMany({ orderBy: { criadoEm: "desc" }, select: { id: true, nome: true, tamanho: true, automatico: true, criadoEm: true } });

  return (
    <div>
      <PageHeader title="Backup" subtitle="Exportação completa em XLSX com abas por módulo" />
      <Card>
        <div className="p-6">
          <p className="text-sm text-muted">
            Baixe o backup completo do sistema em formato Excel (.xlsx) com abas para clientes, empreendimentos, processos, prazos, tarefas, contratos e faturas.
          </p>
          <div className="mt-6">
            <a href="/api/backup">
              <Button>Baixar backup .xlsx</Button>
            </a>
          </div>
           <p className="mt-4 text-xs text-muted">Cada geração fica armazenada para download posterior.</p>
         </div>
      </Card>
      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-navy-900">Backups gerados</h2>
          <p className="mt-1 text-sm text-muted">Histórico dos arquivos disponíveis para baixar novamente.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {backups.map((backup) => (
            <li key={backup.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy-900">{backup.nome} {backup.automatico && <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">automático</span>}</p>
                <p className="text-xs text-muted">Gerado em {formatDateTime(backup.criadoEm)} · {formatBytes(backup.tamanho)}</p>
              </div>
              <a href={`/api/backup/${backup.id}`}>
                <Button variant="secondary" className="whitespace-nowrap">Baixar novamente</Button>
              </a>
            </li>
          ))}
          {backups.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Nenhum backup gerado ainda.</li>}
        </ul>
      </Card>
    </div>
  );
}
