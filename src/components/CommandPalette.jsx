import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import {
  Search, LayoutDashboard, Share2, CalendarClock, Globe, MapPin, CornerDownLeft,
} from "lucide-react";
import { db } from "../firebase/config";
import { useCities } from "../context/CitiesContext";
import { colName } from "../lib/ip";
import { cidadeLabel } from "../lib/cities";
import { classifyLogin } from "../lib/classify";
import { Badge, Spinner } from "./ui";
import { cn } from "../lib/cn";

const NAV = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Relatório de Links", to: "/relatorio", icon: Share2 },
  { label: "Histórico de Eventos", to: "/eventos", icon: CalendarClock },
];

export default function CommandPalette({ onClose }) {
  const { cidades } = useCities();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [ipResults, setIpResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  const ql = q.trim().toLowerCase();

  // Busca global de IPs (debounced)
  useEffect(() => {
    clearTimeout(timer.current);
    if (ql.length < 2) {
      setIpResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = [];
      for (const cidade of cidades) {
        try {
          const snap = await getDocs(collection(db, colName(cidade)));
          snap.docs.forEach((d) => {
            const r = d.data();
            if (r.ip?.toLowerCase().includes(ql) || r.login?.toLowerCase().includes(ql)) {
              found.push({ id: d.id, cidade, ip: r.ip, login: r.login });
            }
          });
        } catch {}
        if (found.length > 40) break;
      }
      setIpResults(found.slice(0, 30));
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [ql, cidades]);

  const navItems = NAV.filter((i) => !ql || i.label.toLowerCase().includes(ql)).map((i) => ({
    type: "nav",
    icon: i.icon,
    label: i.label,
    onSelect: () => navigate(i.to),
  }));

  const cityItems = cidades
    .filter((c) => !ql || c.toLowerCase().includes(ql))
    .slice(0, 8)
    .map((c) => ({
      type: "city",
      icon: MapPin,
      label: cidadeLabel(c),
      onSelect: () => navigate(`/ips?cidade=${encodeURIComponent(c)}`),
    }));

  const ipItems = ipResults.map((r) => ({
    type: "ip",
    label: r.ip,
    sub: `${r.login || "VAGO"} · ${cidadeLabel(r.cidade)}`,
    tipo: classifyLogin(r.login),
    onSelect: () => navigate(`/ips?cidade=${encodeURIComponent(r.cidade)}`),
  }));

  const groups = [
    { title: "Ir para", items: navItems },
    { title: "Cidades", items: cityItems },
    { title: "Resultados de IP", items: ipItems },
  ].filter((g) => g.items.length);

  const flat = groups.flatMap((g) => g.items);

  useEffect(() => setActive(0), [q]);

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(flat[active]); }
    else if (e.key === "Escape") { onClose(); }
  }

  function pick(item) {
    if (!item) return;
    item.onSelect();
    onClose();
  }

  let idx = -1;

  return (
    <div
      className="anim-fade fixed inset-0 z-[90] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card anim-pop w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4.5 w-4.5 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar IP, login, cidade ou seção…"
            className="flex-1 bg-transparent py-4 text-sm text-text outline-none placeholder:text-muted"
          />
          {searching && <Spinner className="h-4 w-4 text-muted" />}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {flat.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted">
              {ql.length >= 2 ? "Nenhum resultado." : "Digite para buscar…"}
            </div>
          )}

          {groups.map((g) => (
            <div key={g.title} className="mb-1">
              <div className="px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
                {g.title}
              </div>
              {g.items.map((item) => {
                idx++;
                const i = idx;
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.type}-${i}`}
                    onMouseMove={() => setActive(i)}
                    onClick={() => pick(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      active === i ? "bg-primary/15" : "hover:bg-surface-2"
                    )}
                  >
                    {item.type === "ip" ? (
                      <Globe className="h-4 w-4 shrink-0 text-muted" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate text-sm", item.type === "ip" ? "ip-mono" : "text-text")}>
                        {item.label}
                      </div>
                      {item.sub && <div className="truncate text-xs text-muted">{item.sub}</div>}
                    </div>
                    {item.tipo && <Badge tipo={item.tipo} />}
                    {active === i && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[0.7rem] text-muted">
          <span className="flex items-center gap-1"><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd>↵</kbd> abrir</span>
          <span className="flex items-center gap-1"><kbd>esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
