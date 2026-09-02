"use client";

import { Button } from "@/components/ui";

export function ImprimirBotao() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}
