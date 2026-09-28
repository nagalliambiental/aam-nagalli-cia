"use client";

import { useMemo, useState } from "react";
import { Card, Input, Label, Select, Badge } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { safeExternalUrl } from "@/lib/urls";

export type LegislacaoIatLinha = {
  id: number;
  tipo: string;
  numero: number;
  ano: number;
  titulo: string;
  ementa: string;
  url: string | null;
  anexosUrl: string | null;
  situacao: string;
  revogadaPor: string | null;
  dataAto: string | null;
  dataPublicacao: string | null;
};

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

function mesPublicacao(p: string): string {
  const [ano, mes] = p.split("-");
  return mes && ano ? `${mes}/${ano}` : p;
}

export function LegislacaoIatPainel({
  itens,
  fonteUrl,
  ultimaVerificacao,
}: {
  itens: LegislacaoIatLinha[];
  fonteUrl: string;
  ultimaVerificacao: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("");
  const [tipo, setTipo] = useState("");
  const [situacao, setSituacao] = useState("");

  const anos = useMemo(() => [...new Set(itens.map((i) => i.ano))].sort((a, b) => b - a), [itens]);
  const totalVigentes = itens.filter((i) => i.situacao === "vigente").length;
  const totalRevogadas = itens.filter((i) => i.situacao === "revogada").length;

  const filtrados = useMemo(() => {
    const b = busca.toLowerCase().trim();
    return itens.filter(
      (i) =>
        (!ano || i.ano === Number(ano)) &&
        (!tipo || i.tipo === tipo) &&
        (!situacao || i.situacao === situacao) &&
        (!b || `${i.titulo} ${i.ementa}`.toLowerCase().includes(b)),
    );
  }, [itens, busca, ano, tipo, situacao]);

  const grupos = useMemo(() => {
    const mapa = new Map<number, LegislacaoIatLinha[]>();
    for (const item of filtrados) {
      const lista = mapa.get(item.ano) ?? [];
      lista.push(item);
      mapa.set(item.ano, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => b.numero - a.numero || a.tipo.localeCompare(b.tipo));
    return [...mapa.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtrados]);

  const fonte = safeExternalUrl(fonteUrl);
  const fonteNorma = (i: LegislacaoIatLinha) => safeExternalUrl(i.url) ?? safeExternalUrl(i.anexosUrl);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="li-busca">Buscar</Label>
            <Input
              id="li-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Número, assunto ou ementa..."
            />
          </div>
          <div>
            <Label htmlFor="li-ano">Ano</Label>
            <Select id="li-ano" value={ano} onChange={(e) => setAno(e.target.value)}>
              <option value="">Todos</option>
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="li-tipo">Tipo</Label>
            <Select id="li-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todas</option>
              <option value="IN">Instrução Normativa</option>
              <option value="OT">Orientação Técnica</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="li-situacao">Situação</Label>
            <Select id="li-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
              <option value="">Todas</option>
              <option value="vigente">Vigentes</option>
              <option value="revogada">Revogadas</option>
            </Select>
          </div>
          <p className="pb-2 text-xs text-muted">
            {totalVigentes} vigente(s) · {totalRevogadas} revogada(s) · {filtrados.length} exibida(s)
          </p>
        </div>

        {grupos.map(([grupoAno, lista]) => (
          <div key={grupoAno}>
            <p className="border-y border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700">
              {grupoAno}
            </p>
            <ul className="divide-y divide-slate-100">
              {lista.map((i) => {
                const link = fonteNorma(i);
                // "Novo" usa a data oficial do ato (ou o mês de publicação), não a data do cadastro.
                const referencia = i.dataAto
                  ? new Date(i.dataAto).getTime()
                  : i.dataPublicacao
                    ? Date.parse(`${i.dataPublicacao}-01T00:00:00Z`)
                    : null;
                const novo = referencia !== null && Date.now() - referencia < TRINTA_DIAS;
                return (
                  <li key={i.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-navy-900">
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                            {i.titulo} ↗
                          </a>
                        ) : (
                          i.titulo
                        )}
                        {i.situacao === "revogada" ? <Badge tone="red">Revogada</Badge> : novo ? <Badge tone="green">Novo</Badge> : null}
                        <Badge tone="gray">{i.tipo}</Badge>
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted">{i.ementa}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                      {safeExternalUrl(i.url) && (
                        <a href={safeExternalUrl(i.url)!} target="_blank" rel="noreferrer" className="font-medium text-navy-600 underline-offset-2 hover:underline">
                          Abrir norma (PDF) ↗
                        </a>
                      )}
                      {safeExternalUrl(i.anexosUrl) && (
                        <a href={safeExternalUrl(i.anexosUrl)!} target="_blank" rel="noreferrer" className="font-medium text-navy-600 underline-offset-2 hover:underline">
                          Anexos ↗
                        </a>
                      )}
                      {i.situacao === "revogada" && i.revogadaPor && (
                        <span className="font-medium text-red-600">Revogada pela {i.revogadaPor}</span>
                      )}
                      {i.dataAto && <span className="text-muted">Data do ato: {formatDate(new Date(i.dataAto))}</span>}
                      {!i.dataAto && i.dataPublicacao && (
                        <span className="text-muted">Publicada em {mesPublicacao(i.dataPublicacao)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {filtrados.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Nenhuma norma encontrada com os filtros informados.
          </p>
        )}

        <p className="border-t border-slate-200 px-5 py-3 text-xs text-muted">
          {ultimaVerificacao ? `Última verificação: ${formatDateTime(ultimaVerificacao)} · ` : ""}
          Atualização automática diária · Fonte:{" "}
          {fonte ? (
            <a href={fonte} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              Instruções Normativas / Orientações Técnicas do IAT ↗
            </a>
          ) : (
            "site do IAT"
          )}
        </p>
      </Card>
    </div>
  );
}
