"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function BuscaAuto({
  placeholder,
  valorInicial = "",
  atraso = 400,
}: {
  placeholder: string;
  valorInicial?: string;
  atraso?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (v.trim()) sp.set("q", v.trim());
      else sp.delete("q");
      router.replace(`${pathname}?${sp.toString()}`);
    }, atraso);
  }

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 p-4">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          defaultValue={valorInicial}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
        />
      </div>
    </div>
  );
}
