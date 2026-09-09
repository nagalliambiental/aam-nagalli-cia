"use client";

import { useEffect } from "react";

export function BackupAutomatico({ administrador }: { administrador: boolean }) {
  useEffect(() => {
    if (!administrador) return;
    let ativo = true;
    async function verificar() {
      const response = await fetch("/api/backup/automatico", { cache: "no-store" });
      if (!response.ok || !ativo) return;
      const data = await response.json();
      if (!data.due || !ativo) return;
      const link = document.createElement("a");
      link.href = "/api/backup?automatico=1";
      link.download = "backup-aam-automatico.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    verificar();
    return () => { ativo = false; };
  }, [administrador]);

  return null;
}
