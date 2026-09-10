"use client";

import dynamic from "next/dynamic";

const Mapa = dynamic(() => import("./SigmineMapa").then((m) => m.SigmineMapa), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center text-sm text-muted lg:h-[560px]">
      Carregando mapa...
    </div>
  ),
});

export function SigmineMapaDinamico({
  aneis,
  titulo,
  descricao,
}: {
  aneis: number[][][];
  titulo: string;
  descricao: string;
}) {
  return <Mapa aneis={aneis} titulo={titulo} descricao={descricao} />;
}
