"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, LayersControl, Polygon, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";

function AjustarZoom({ posicoes }: { posicoes: LatLngExpression[][] }) {
  const map = useMap();
  const pontos = useMemo(() => {
    const lista: [number, number][] = [];
    for (const anel of posicoes) for (const p of anel) lista.push(p as [number, number]);
    return lista;
  }, [posicoes]);

  useEffect(() => {
    const ajustar = () => {
      map.invalidateSize();
      if (pontos.length > 0) map.fitBounds(pontos, { padding: [24, 24] });
    };
    ajustar();
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) ajustar();
    });
    obs.observe(map.getContainer());
    return () => obs.disconnect();
  }, [map, pontos]);

  return null;
}

export function SigmineMapa({
  aneis,
  titulo,
  descricao,
}: {
  aneis: number[][][];
  titulo: string;
  descricao: string;
}) {
  const posicoes = useMemo<LatLngExpression[][]>(
    () => aneis.map((anel) => anel.map(([x, y]) => [y, x] as [number, number])),
    [aneis]
  );
  const centro = useMemo<LatLngExpression>(() => {
    const primeiro = posicoes[0]?.[0];
    return (primeiro ?? [-15.78, -47.93]) as LatLngExpression;
  }, [posicoes]);

  return (
    <MapContainer center={centro} zoom={6} scrollWheelZoom className="h-[480px] w-full lg:h-[560px]" style={{ zIndex: 0 }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satélite">
          <TileLayer
            attribution="Imagens &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Ruas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <AjustarZoom posicoes={posicoes} />
      <Polygon positions={posicoes} pathOptions={{ color: "#ff740d", weight: 2, fillColor: "#ff740d", fillOpacity: 0.25 }}>
        <Popup>
          <strong>{titulo}</strong>
          <br />
          {descricao}
        </Popup>
      </Polygon>
    </MapContainer>
  );
}
