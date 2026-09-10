import { Card, CardHeader } from "@/components/ui";
import { SigmineMapaDinamico } from "./SigmineMapaDinamico";
import type { SigmineGeo } from "@/lib/sigmine";

const APP_URL = "https://geo.anm.gov.br/portal/apps/webappviewer/index.html?id=6a8f5ccc4b6a4c2bba79759aa952d908";

export function SigminePanel({ numero, geo }: { numero: string; geo: SigmineGeo | null }) {
  const params = new URLSearchParams();
  if (geo) params.set("find", geo.processo);
  if (geo?.extent) {
    const e = geo.extent;
    params.set("extent", `${e.xmin},${e.ymin},${e.xmax},${e.ymax}`);
  }
  const query = params.toString();
  const mapaUrl = query ? `${APP_URL}&${query}` : APP_URL;

  const infos: [string, string][] = geo
    ? [
        ["Processo", geo.dscProcesso || geo.processo],
        ["Fase", geo.fase || "—"],
        ["Titular", geo.titular || "—"],
        ["Substância", geo.substancia || "—"],
        ["Uso", geo.uso || "—"],
        ["Área (ha)", geo.areaHa != null ? String(geo.areaHa).replace(".", ",") : "—"],
        ["UF", geo.uf || "—"],
        ["Último evento", geo.ultimoEvento || "—"],
      ]
    : [];

  return (
    <Card>
      <CardHeader
        title="SIGMINE — mapa do processo"
        subtitle={`Busca no mapa: ${geo?.processo ?? numero.replace(".", "")}`}
        actions={
          <a href={mapaUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-navy-600 hover:underline">
            Abrir no SIGMINE ↗
          </a>
        }
      />
      <div className="flex flex-col gap-0 lg:flex-row">
        <div className="min-w-0 flex-1 lg:basis-[70%] lg:border-r lg:border-slate-200">
          {geo?.aneis ? (
            <SigmineMapaDinamico
              aneis={geo.aneis}
              titulo={`Processo ${geo.dscProcesso || geo.processo}`}
              descricao={`${geo.fase || ""}${geo.substancia ? ` · ${geo.substancia}` : ""}${geo.areaHa != null ? ` · ${String(geo.areaHa).replace(".", ",")} ha` : ""}`}
            />
          ) : (
            <iframe
              title={`Mapa SIGMINE do processo ${numero}`}
              src={mapaUrl}
              className="h-[480px] w-full border-0 lg:h-[560px]"
              loading="lazy"
              allowFullScreen
            />
          )}
        </div>
        <div className="border-t border-slate-200 p-5 lg:basis-[30%] lg:border-t-0">
          <h3 className="mb-3 text-sm font-semibold text-navy-900">Dados do SIGMINE</h3>
          {geo ? (
            <dl className="space-y-3 text-sm">
              {infos.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">
              Polígono não encontrado no SIGMINE para este número. Confira o número do processo ou abra o mapa oficial pelo link acima.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
