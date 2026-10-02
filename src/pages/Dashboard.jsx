import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, getCountFromServer } from "firebase/firestore";
import {
  Network, CheckCircle2, CircleSlash, MapPin, Share2, RefreshCw, ArrowRight, CalendarClock,
} from "lucide-react";
import { db } from "../firebase/config";
import { useCities } from "../context/CitiesContext";
import { useCollection } from "../hooks/useCollection";
import { classifyLogin } from "../lib/classify";
import { colName, normalizeIPRecord } from "../lib/ip";
import { Card, Button, Loading, EmptyState } from "../components/ui";
import { Donut, CityBars } from "../components/charts";

import { readCache } from "../lib/readCache";

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
  const [details, setDetails] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const links = useCollection("relatorio_links");
  const eventos = useCollection("historico_eventos", { take: 6 });

  async function load(withDetails = false, force = false) {
    if (!cidades.length) return;
    setLoading(true);
    setError("");
    try {
      const result = await Promise.all(cidades.map(async (c) => {
        const col = collection(db, colName(c));
        if (!withDetails) {
          const count = await readCache.get("count:" + colName(c), () => getCountFromServer(col), force);
          return { cidade: c, total: count.data().count, vagos: 0, reservados: 0 };
        }
        const snap = await readCache.get(colName(c), () => getDocs(col), force);
        const records = snap.docs.map((d) => normalizeIPRecord(d.data(), c));
        return { cidade: c, total: records.length,
          vagos: records.filter((r) => classifyLogin(r.login) === "vago").length,
          reservados: records.filter((r) => classifyLogin(r.login) === "reservado").length };
      }));
      setRows(result);
      setDetails(withDetails);
    } catch {
      setError("Não foi possível atualizar os totais. A cota do Firebase pode estar esgotada. Os últimos dados exibidos foram preservados.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(cidades)]);

  const totals = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.total, 0);
    const vagos = rows.reduce((a, r) => a + r.vagos, 0);
    const reservados = rows.reduce((a, r) => a + (r.reservados || 0), 0);
    return { total, vagos, reservados, usados: total - vagos - reservados };
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
        <Button variant="soft" size="sm" onClick={() => load(details, true)} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-muted">Totais consultados sob demanda e reutilizados por até 5 minutos. Ocupação detalhada disponível no botão abaixo.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <KpiCard icon={Network} label="Total de IPs" value={loading ? "…" : totals.total} color="#38bdf8" to="/ips" />
        <KpiCard icon={CheckCircle2} label="Usados" value={loading ? "…" : details ? totals.usados : "—"} color="#22c55e" />
        <KpiCard icon={CircleSlash} label="Vagos" value={loading ? "…" : details ? totals.vagos : "—"} color="#f59e0b" />
        <KpiCard icon={CircleSlash} label="Reservados" value={loading ? "…" : details ? totals.reservados : "—"} color="#a78bfa" />
        <KpiCard icon={MapPin} label="Cidades" value={cidades.length} color="#a78bfa" to="/ips" />
        <KpiCard icon={Share2} label="Links" value={links.loading ? "…" : links.data.length} color="#f472b6" to="/relatorio" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ocupação */}
        <Card className="flex flex-col items-center justify-center gap-5 p-6">
          <h2 className="self-start text-sm font-semibold text-text">Ocupação geral</h2>
          {loading ? (
            <Loading />
          ) : !details ? <Button variant="soft" onClick={() => load(true)}>Consultar ocupação detalhada</Button> : (
            <>
              <Donut used={totals.usados} vagos={totals.vagos} reservados={totals.reservados} />
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
          {loading ? <Loading /> : details ? <CityBars rows={topCidades} /> : <div className="space-y-3">{topCidades.map((row) => <div key={row.cidade} className="flex justify-between"><span>{row.cidade}</span><b>{row.total} IPs</b></div>)}</div>}
        </Card>
      </div>

      {/* Eventos carregados */}
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
        ) : eventos.error ? <p role="alert" className="p-4">Não foi possível consultar os eventos.</p> : eventosRecentes.length === 0 ? (
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
