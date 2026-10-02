import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { Radio, Eye, Moon, Sun } from "lucide-react";
import { db } from "../firebase/config";
import { useTheme } from "../context/ThemeContext";
import { Card, Button, Input, Select, Loading, EmptyState } from "../components/ui";
import { cidadeLabel as defaultLabel } from "../lib/cities";
import { OCCURRENCE_STATUS, filterOccurrences, formatOccurrenceDate } from "../lib/occurrences";

const COLORS = { ABERTA: "bg-red-500/15 text-red-400", "EM ATENDIMENTO": "bg-amber-500/15 text-amber-400", RESOLVIDA: "bg-emerald-500/15 text-emerald-400" };

// This screen subscribes only to occurrences and city labels; it has no write actions.
export default function Monitoramento() {
  const { theme, toggle } = useTheme();
  const [data, setData] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cached, setCached] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState({ cidade: "", status: "", search: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const stop = onSnapshot(collection(db, "ocorrencias"), { includeMetadataChanges: true }, (snapshot) => {
      setData(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
      setCached(snapshot.metadata.fromCache);
      if (!snapshot.metadata.fromCache) setUpdated(new Date());
      setLoading(false);
      setError(false);
    }, () => { setError(true); setLoading(false); setData([]); });
    const stopNames = onSnapshot(doc(db, "config", "cidades"), (snapshot) => {
      setNames(snapshot.data()?.nomes || {});
    }, () => setNames({}));
    return () => { stop(); stopNames(); };
  }, [attempt]);

  const label = (city) => names[city] || defaultLabel(city);
  const cities = [...new Set(data.map((r) => r.cidade).filter(Boolean))].sort((a, b) => label(a).localeCompare(label(b), "pt-BR"));
  const rows = filterOccurrences(data, filters, label);
  const pages = Math.max(1, Math.ceil(rows.length / 30));
  const current = Math.min(page, pages);
  const filter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };

  return <main className="min-h-full bg-bg p-4 text-text md:p-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">WSP FIBRA · Call center</p><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Radio className="h-6 w-6 text-primary" />Monitoramento de chamados</h1><p className="mt-1 text-sm text-muted">Acompanhe as ocorrências por cidade, OLT e CTO.</p></div>
        <div className="flex items-center gap-3"><span className="badge bg-primary/10 text-primary"><Eye className="mr-1 h-3.5 w-3.5" />Somente leitura</span><Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}>{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button><Link to="/" className="text-sm text-muted hover:text-primary">Tela inicial</Link></div>
      </header>
      <p className="text-xs text-muted" role="status">{error ? "Atualização indisponível." : loading ? "Conectando…" : cached ? "Conectando ao servidor. Os dados disponíveis podem estar desatualizados." : "Atualização automática · Última sincronização: " + updated?.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " (Brasília)"}</p>
      {error ? <Card className="p-6" role="alert"><p>Não foi possível carregar os chamados. Verifique a conexão e tente novamente.</p><Button className="mt-3" onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</Button></Card> : <>
        <div className="grid gap-3 sm:grid-cols-3">{OCCURRENCE_STATUS.map((status) => <Card key={status} className="p-4"><p className="mb-1 text-3xl font-bold">{loading ? "…" : data.filter((r) => r.status === status).length}</p><span className={"badge " + COLORS[status]}>{status}</span></Card>)}</div>
        <div className="flex flex-wrap gap-3">
          <Input className="sm:max-w-sm" aria-label="Buscar chamados" placeholder="Protocolo, OLT, CTO ou motivo…" value={filters.search} onChange={(e) => filter("search", e.target.value)} />
          <Select className="sm:w-auto" aria-label="Filtrar cidade" value={filters.cidade} onChange={(e) => filter("cidade", e.target.value)}><option value="">Todas as cidades</option>{cities.map((city) => <option key={city} value={city}>{label(city)}</option>)}</Select>
          <Select className="sm:w-auto" aria-label="Filtrar status" value={filters.status} onChange={(e) => filter("status", e.target.value)}><option value="">Todos os status</option>{OCCURRENCE_STATUS.map((status) => <option key={status}>{status}</option>)}</Select>
          <Button variant="ghost" onClick={() => { setFilters({ cidade: "", status: "", search: "" }); setPage(1); }}>Limpar filtros</Button>
        </div>
        {loading ? <Loading label="Carregando chamados…" /> : !rows.length ? <Card><EmptyState icon={Radio} title="Nenhum chamado encontrado" desc={data.length ? "Tente outra busca ou limpe os filtros." : "Nenhuma ocorrência registrada no momento."} /></Card> : <div className="grid gap-4 lg:grid-cols-2">{rows.slice((current - 1) * 30, current * 30).map((r) => <Card key={r.id} className="min-w-0 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-primary">{label(r.cidade)}</h2><span className={"badge " + (COLORS[r.status] || "")}>{r.status || "Sem status"}</span></div>
          <p className="mb-4 whitespace-pre-wrap break-words font-semibold">{r.motivo || "Motivo não informado"}</p>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">{[["Protocolo", r.protocolo], ["Abertura", formatOccurrenceDate(r.inicio)], ["OLT / PON", r.olt], ["CTO / Ramal", r.cto], ["Responsável", r.responsavel], ["Encerramento", formatOccurrenceDate(r.fim)]].map(([title, value]) => <div key={title} className="min-w-0"><dt className="mb-1 text-xs text-muted">{title}</dt><dd className="whitespace-pre-wrap break-words">{value || "—"}</dd></div>)}</dl>
          {r.observacoes && <div className="mt-4 border-t border-border pt-3"><p className="mb-1 text-xs text-muted">Observações / solução</p><p className="whitespace-pre-wrap break-words text-sm">{r.observacoes}</p></div>}
        </Card>)}</div>}
        {!loading && <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted"><Button variant="ghost" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</Button><span>{rows.length} chamados · Página {current} de {pages}</span><Button variant="ghost" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>Próxima</Button></div>}
      </>}
      <footer className="text-center text-xs text-muted">Consulta pública · Horários de Brasília</footer>
    </div>
  </main>;
}
