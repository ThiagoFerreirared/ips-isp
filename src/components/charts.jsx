import React from "react";
import { cidadeLabel } from "../lib/cities";

// Anel de ocupação (usados vs vagos).
export function Donut({ used = 0, vagos = 0, size = 168, stroke = 18 }) {
  const total = used + vagos;
  const pct = total ? used / total : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-extrabold text-text">{Math.round(pct * 100)}%</div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted">ocupação</div>
      </div>
    </div>
  );
}

// Lista de barras empilhadas (usados/vagos) por cidade.
export function CityBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const usados = r.total - r.vagos;
        return (
          <div key={r.cidade}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium text-text-soft">{cidadeLabel(r.cidade)}</span>
              <span className="shrink-0 text-muted">
                <span className="font-semibold text-text">{r.total}</span> · {r.vagos} vagos
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3" style={{ width: `${Math.max(6, (r.total / max) * 100)}%` }}>
              <div className="h-full bg-primary" style={{ width: `${r.total ? (usados / r.total) * 100 : 0}%` }} />
              <div className="h-full bg-amber-500/70" style={{ width: `${r.total ? (r.vagos / r.total) * 100 : 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
