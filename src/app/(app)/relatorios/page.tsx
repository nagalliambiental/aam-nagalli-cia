import { PageHeader, Card, Button } from "@/components/ui";
import { requirePermissao } from "@/lib/perfil";
import Link from "next/link";

const REPORTS = [
  { tipo: "clientes", titulo: "Clientes", descricao: "Relatório completo de clientes (empresas e pessoas físicas)." },
  { tipo: "empreendimentos", titulo: "Empreendimentos", descricao: "Relatório completo de empreendimentos ativos." },
  { tipo: "processos-minerarios", titulo: "Processos Minerários", descricao: "Processos minerários com filtro por status antes de emitir." },
  { tipo: "processos-ambientais", titulo: "Processos Ambientais", descricao: "Processos ambientais com filtro por status antes de emitir." },
  { tipo: "prazos", titulo: "Prazos", descricao: "Prazos com filtro por dias antes do vencimento antes de emitir." },
];

export default async function RelatoriosPage() {
  await requirePermissao("relatorio:ler");
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Relatórios gerenciais disponíveis" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.tipo} className="flex flex-col p-5">
            <h3 className="text-base font-semibold text-navy-900">{r.titulo}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{r.descricao}</p>
            <div className="mt-4">
              <Link href={`/relatorios/${r.tipo}`}>
                <Button variant="secondary">Abrir</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
