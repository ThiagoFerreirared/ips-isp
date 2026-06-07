import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import {
  Network, CheckCircle2, CircleSlash, MapPin, Share2, RefreshCw, ArrowRight, CalendarClock,
} from "lucide-react";
import { db } from "../firebase/config";
import { useCities } from "../context/CitiesContext";
import { useCollection } from "../hooks/useCollection";
import { colName } from "../lib/ip";
import { cidadeLabel } from "../lib/cities";
import { Card, Button, Loading, EmptyState } from "../components/ui";
import { Donut, CityBars } from "../components/charts";

function statusColor(s) {
  const v = (s || "").toUpperCase();
  if (v === "INDISPONÍVEL") return "#ef4444";
  if (v === "DEGRADAÇÃO") return "#f59e0b";
  return "#22c55e";
}

function KpiCard({ icon: Icon, label, value, color, to }) {
  const inner = (
    <Card className="flex items-center gap-4 p-5 transition hover:border-border-strong">
      <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${color}1f`, color }}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none text-text">{value}</div>
        <div className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      </div>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const { cidades } = useCities();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const links = useCollection("relatorio_links");
  const eventos = useCollection("historico_eventos");

  async function load() {
    if (!cidades.length) return;
    setLoading(true);
    const result = await Promise.all(
      cidades.map(async (c) => {
        try {
          const col = collection(db, colName(c));
          const [t, v] = await Promise.all([
            getCountFromServer(col),
            getCountFromServer(query(col, where("login", "==", "VAGO"))),
          ]);
          return { cidade: c, total: t.data().count, vagos: v.data().count };
        } catch {
          return { cidade: c, total: 0, vagos: 0 };
        }
      })
    );
    setRows(result);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cidades]);

  const totals = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.total, 0);
    const vagos = rows.reduce((a, r) => a + r.vagos, 0);
    return { total, vagos, usados: total - vagos };
  }, [rows]);

  const topCidades = useMemo(() => [...rows].sort((a, b) => b.total - a.total).slice(0, 8), [rows]);

  const eventosRecentes = useMemo(
    () =>
      [...eventos.data]
        .sort((a, b) => {
          const da = (a.data || "").split("/").reverse().join("-");
          const db2 = (b.data || "").split("/").reverse().join("-");
          return db2.localeCompare(da);
        })
        .slice(0, 6),
    [eventos.data]
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text">Dashboard</h1>
          <p className="text-sm text-muted">Visão geral do endereçamento e da rede</p>
        </div>
        <Button variant="soft" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={Network} label="Total de IPs" value={loading ? "…" : totals.total} color="#38bdf8" to="/ips" />
        <KpiCard icon={CheckCircle2} label="Usados" value={loading ? "…" : totals.usados} color="#22c55e" />
        <KpiCard icon={CircleSlash} label="Vagos" value={loading ? "…" : totals.vagos} color="#f59e0b" />
        <KpiCard icon={MapPin} label="Cidades" value={cidades.length} color="#a78bfa" to="/ips" />
        <KpiCard icon={Share2} label="Links" value={links.loading ? "…" : links.data.length} color="#f472b6" to="/relatorio" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ocupação */}
        <Card className="flex flex-col items-center justify-center gap-5 p-6">
          <h2 className="self-start text-sm font-semibold text-text">Ocupação geral</h2>
          {loading ? (
            <Loading />
          ) : (
            <>
              <Donut used={totals.usados} vagos={totals.vagos} />
              <div className="flex gap-5 text-sm">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Usados <b className="text-text">{totals.usados}</b></span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" /> Vagos <b className="text-text">{totals.vagos}</b></span>
              </div>
            </>
          )}
        </Card>

        {/* Barras por cidade */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-text">IPs por cidade</h2>
          {loading ? <Loading /> : <CityBars rows={topCidades} />}
        </Card>
      </div>

      {/* Eventos recentes */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <CalendarClock className="h-4 w-4 text-primary" /> Eventos recentes
          </h2>
          <Link to="/eventos" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {eventos.loading ? (
          <Loading />
        ) : eventosRecentes.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Sem eventos" desc="Nenhum evento registrado ainda." />
        ) : (
          <div className="divide-y divide-border">
            {eventosRecentes.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: statusColor(e.status) }} />
                <span className="w-20 shrink-0 text-xs font-medium text-muted">{e.data}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-text-soft">
                  <b className="text-text">{e.operadora || "—"}</b>
                  {e.evento ? ` · ${e.evento}` : ""}
                </span>
                <span className="shrink-0 text-xs font-semibold" style={{ color: statusColor(e.status) }}>{e.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
