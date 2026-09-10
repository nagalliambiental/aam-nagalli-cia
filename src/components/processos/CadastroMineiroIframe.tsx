"use client";

/**
 * Espelho da página do Cadastro Mineiro (ANM) num iframe via proxy interno,
 * com o número do processo pré-preenchido automaticamente. O captcha é
 * resolvido manualmente; o envio do formulário vai direto para a ANM.
 * Sem rolagem horizontal.
 */
export function CadastroMineiroPanel({ numero }: { numero: string }) {
  const m = numero.replace(/\s/g, "").match(/(\d{3})\.?(\d{3})\/(\d{4})/);
  const slug = m ? `${m[1]}${m[2]}/${m[3]}` : encodeURIComponent(numero);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <iframe
        src={`/api/processos/cadastro-mineiro/proxy/${encodeURIComponent(slug)}`}
        title={`Cadastro Mineiro — ${numero}`}
        className="w-full border-0"
        style={{ height: "calc(100vh - 240px)", minHeight: 900, overflowX: "hidden" }}
      />
    </div>
  );
}
