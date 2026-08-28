"use client";

import { useState } from "react";

export type TabDef = { id: string; label: string; count?: number };

export function Tabs({
  tabs,
  children,
  defaultId,
}: {
  tabs: TabDef[];
  children: React.ReactNode[] | React.ReactNode;
  defaultId: string;
}) {
  const [active, setActive] = useState(defaultId);
  const arr = Array.isArray(children) ? children : [children];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`relative -mb-px rounded-t-md px-4 py-2 text-sm font-medium transition ${
              active === t.id
                ? "bg-white text-navy-900 border border-slate-200 border-b-white"
                : "text-muted hover:text-navy-900"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs text-slate-600">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {arr.map((child, i) => (
        <div key={tabs[i].id} className={active === tabs[i].id ? "block" : "hidden"}>
          {child}
        </div>
      ))}
    </div>
  );
}
