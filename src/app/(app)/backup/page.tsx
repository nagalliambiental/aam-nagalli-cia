import { PageHeader, Card, Button } from "@/components/ui";
import Link from "next/link";

export default function BackupPage() {
  return (
    <div>
      <PageHeader title="Backup" subtitle="Exportação completa em XLSX com abas por módulo" />
      <Card>
        <div className="p-6">
          <p className="text-sm text-muted">
            Baixe o backup completo do sistema em formato Excel (.xlsx) com abas para clientes, empreendimentos, processos, títulos, licenças, prazos, tarefas, exigências, custos e contratos.
          </p>
          <div className="mt-6">
            <a href="/api/backup">
              <Button>Baixar backup .xlsx</Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">O arquivo é gerado em tempo real com os dados atuais do banco.</p>
        </div>
      </Card>
    </div>
  );
}
