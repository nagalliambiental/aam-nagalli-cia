"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Torna todas as barras de busca (form method=get + input[name=q]) automáticas:
 * filtra ao digitar (debounce) sem precisar clicar em Buscar, e oculta o botão.
 */
export function BuscaAutoGlobal() {
  const pathname = usePathname();

  useEffect(() => {
    const timers = new Map<HTMLFormElement, ReturnType<typeof setTimeout>>();
    const cleanups: (() => void)[] = [];

    document.querySelectorAll<HTMLFormElement>('form[method="get"]').forEach((form) => {
      const input = form.querySelector<HTMLInputElement>('input[name="q"]');
      if (!input) return;
      // oculta o botão Buscar (a busca agora é ao digitar)
      form.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((b) => {
        if (/buscar/i.test(b.textContent ?? "")) b.style.display = "none";
      });
      const onInput = () => {
        const prev = timers.get(form);
        if (prev) clearTimeout(prev);
        timers.set(
          form,
          setTimeout(() => form.requestSubmit(), 450)
        );
      };
      input.addEventListener("input", onInput);
      cleanups.push(() => {
        input.removeEventListener("input", onInput);
        const t = timers.get(form);
        if (t) clearTimeout(t);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
