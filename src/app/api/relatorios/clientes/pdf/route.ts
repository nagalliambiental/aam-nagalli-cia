import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const clientes = await prisma.empresa.findMany({
    where: { ativo: true, deletedAt: null },
    orderBy: { razaoSocial: "asc" },
    include: { contatos: { where: { ativo: true, deletedAt: null } } },
  });

  const rows = clientes
    .map((c) => `<tr><td>${c.razaoSocial}</td><td>${c.cnpj ?? ""}</td><td>${c.municipio ?? ""}/${c.uf ?? ""}</td><td>${c.contatos.map((x) => x.nome).filter(Boolean).join(", ")}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Clientes - AAM</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;margin:24px;font-size:12px;color:#111}
  h1{margin:0 0 4px;font-size:18px}
  .sub{color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
  th{background:#f0f0f0}
  @media print{body{margin:0}.acao{display:none}}
</style></head><body>
  <h1>AAM Nagalli &amp; Cia LTDA - Clientes</h1>
  <p class="sub">Emitido em ${new Date().toLocaleDateString("pt-BR")} · ${clientes.length} cliente(s)</p>
  <table><thead><tr><th>Razão Social</th><th>CNPJ</th><th>Município/UF</th><th>Contatos</th></tr></thead><tbody>${rows || "<tr><td colspan=4>Nenhum cliente.</td></tr>"}</tbody></table>
  <p class="acao" style="margin-top:16px"><button onclick="window.print()">Imprimir / Salvar PDF</button></p>
  <script>window.addEventListener("load",()=>{})</script>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
