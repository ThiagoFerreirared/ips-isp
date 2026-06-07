import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import {
  Plus, Zap, Download, FileSpreadsheet, Search, Pencil, History, Trash2, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Network, CheckCircle2, CircleSlash,
} from "lucide-react";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useCities } from "../context/CitiesContext";
import { useToast } from "../context/ToastContext";
import { useCollection } from "../hooks/useCollection";
import { classifyLogin } from "../lib/classify";
import { exportIPsExcel } from "../lib/exports";
import { colName, toKey, sortIP, detectarBlocos } from "../lib/ip";
import { extrasFor, cidadeLabel } from "../lib/cities";
import { Button, Input, Select, Badge, Card, Loading, EmptyState } from "../components/ui";
import { cn } from "../lib/cn";
import CityTabs from "../components/ip/CityTabs";
import IPFormModal from "../components/ip/IPFormModal";
import BulkImportModal from "../components/ip/BulkImportModal";
import GenerateBlockModal from "../components/ip/GenerateBlockModal";
import HistoryModal from "../components/ip/HistoryModal";

const PAGE_SIZE = 100;
const ROW_TINT = {
  equip: "rgba(99,102,241,0.06)",
  cgnat: "rgba(234,88,12,0.06)",
  cliente: "rgba(34,197,94,0.05)",
  vago: "transparent",
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-2xl font-extrabold leading-none text-text">{value}</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      </div>
    </Card>
  );
}

export default function IPs() {
  const { user } = useAuth();
  const { cidades } = useCities();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const cidade = params.get("cidade") || cidades[0] || "";
  const setCidade = (c) => setParams({ cidade: c });

  const colKey = cidade ? colName(cidade) : null;
  const extras = extrasFor(cidade);
  const { data, loading } = useCollection(colKey);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [bloco, setBloco] = useState("TODOS");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null); // {type, record}

  useEffect(() => {
    setBusca(""); setFiltro("TODOS"); setBloco("TODOS"); setPagina(1);
  }, [cidade]);

  const registros = useMemo(() => [...data].sort((a, b) => sortIP(a.ip) - sortIP(b.ip)), [data]);
  const blocos = useMemo(() => detectarBlocos(registros), [registros]);

  const filtrados = useMemo(
    () =>
      registros.filter((r) => {
        const txt = busca.toLowerCase();
        const mBusca =
          !txt ||
          r.ip?.toLowerCase().includes(txt) ||
          r.login?.toLowerCase().includes(txt) ||
          r.obs?.toLowerCase().includes(txt);
        const tipo = classifyLogin(r.login);
        const mFiltro =
          filtro === "TODOS" || tipo === filtro || (filtro === "USADO" && tipo !== "vago");
        const mBloco = bloco === "TODOS" || r.ip?.startsWith(bloco + ".");
        return mBusca && mFiltro && mBloco;
      }),
    [registros, busca, filtro, bloco]
  );

  const totalPags = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pagAtual = Math.min(pagina, totalPags);
  const slice = filtrados.slice((pagAtual - 1) * PAGE_SIZE, pagAtual * PAGE_SIZE);

  const vagos = useMemo(() => registros.filter((r) => classifyLogin(r.login) === "vago").length, [registros]);
  const usados = registros.length - vagos;

  /* ───────── ações ───────── */
  async function salvar(form) {
    const editando = modal?.record;
    try {
      if (editando) {
        const before = editando;
        const diff = {};
        ["ip", "login", "data", "obs", ...extras].forEach((k) => {
          if ((before[k] || "") !== (form[k] || "")) diff[k] = { de: before[k] || "", para: form[k] || "" };
        });
        await updateDoc(doc(db, colKey, editando.id), form);
        if (Object.keys(diff).length) {
          await addDoc(collection(db, "historico"), {
            ip: form.ip, cidade: toKey(cidade), acao: "Edição", diff,
            usuario: user?.email || "desconhecido", timestamp: serverTimestamp(),
          });
        }
        toast.success("Registro atualizado.");
      } else {
        await addDoc(collection(db, colKey), form);
        await addDoc(collection(db, "historico"), {
          ip: form.ip, cidade: toKey(cidade), acao: "Criação", diff: {},
          usuario: user?.email || "desconhecido", timestamp: serverTimestamp(),
        });
        toast.success("IP adicionado.");
      }
      setModal(null);
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  }

  async function excluir(r) {
    const ok = await toast.confirm({
      title: "Excluir IP",
      message: `Excluir o IP ${r.ip}?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, colKey, r.id));
      await addDoc(collection(db, "historico"), {
        ip: r.ip, cidade: toKey(cidade), acao: "Exclusão", diff: {},
        usuario: user?.email || "desconhecido", timestamp: serverTimestamp(),
      });
      toast.success("IP excluído.");
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  }

  function copiar(ip) {
    navigator.clipboard?.writeText(ip);
    toast.info(`${ip} copiado.`);
  }

  const colSpan = 6 + extras.length;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="mb-1 text-xl font-extrabold tracking-tight text-text">Gerenciamento de IPs</h1>
        <p className="text-sm text-muted">Endereçamento por cidade · {cidadeLabel(cidade)}</p>
      </div>

      <CityTabs cidade={cidade} onSelect={setCidade} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Network} label="Total" value={registros.length} color="#38bdf8" />
        <StatCard icon={CheckCircle2} label="Usados" value={usados} color="#22c55e" />
        <StatCard icon={CircleSlash} label="Vagos" value={vagos} color="#f59e0b" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Buscar IP, login, obs…"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
          />
        </div>

        <Select value={filtro} onChange={(e) => { setFiltro(e.target.value); setPagina(1); }} className="w-auto">
          <option value="TODOS">Todos</option>
          <option value="vago">Vagos</option>
          <option value="USADO">Usados</option>
          <option value="equip">Equipamentos</option>
          <option value="cgnat">CGNAT</option>
          <option value="cliente">Clientes</option>
        </Select>

        {blocos.length > 2 && (
          <Select value={bloco} onChange={(e) => { setBloco(e.target.value); setPagina(1); }} className="w-auto">
            {blocos.map((b) => (
              <option key={b} value={b}>{b === "TODOS" ? "Todos os blocos" : b + ".0/24"}</option>
            ))}
          </Select>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setModal({ type: "form", record: null })}><Plus className="h-4 w-4" /> Novo IP</Button>
          <Button size="sm" variant="success" onClick={() => setModal({ type: "gen" })}><Zap className="h-4 w-4" /> Gerar bloco</Button>
          <Button size="sm" variant="purple" onClick={() => setModal({ type: "bulk" })}><Download className="h-4 w-4" /> Importar</Button>
          <Button size="sm" variant="soft" onClick={() => exportIPsExcel(registros, cidade, extras)}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        </div>
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : slice.length === 0 ? (
          <EmptyState
            icon={Network}
            title="Nenhum registro"
            desc={registros.length ? "Nenhum IP corresponde aos filtros." : "Adicione ou gere IPs para começar."}
            action={<Button size="sm" onClick={() => setModal({ type: "form", record: null })}><Plus className="h-4 w-4" /> Novo IP</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>IP</th>
                  <th>Login</th>
                  {extras.map((e) => <th key={e}>{e.replace(/_/g, " ")}</th>)}
                  <th>Data</th>
                  <th>Observação</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((r, i) => {
                  const tipo = classifyLogin(r.login);
                  return (
                    <tr key={r.id} style={{ background: ROW_TINT[tipo] }}>
                      <td className="text-muted">{(pagAtual - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <button onClick={() => copiar(r.ip)} className="ip-mono group inline-flex items-center gap-1.5" title="Copiar IP">
                          {r.ip}
                          <Copy className="h-3 w-3 text-muted opacity-0 transition group-hover:opacity-100" />
                        </button>
                      </td>
                      <td><Badge tipo={tipo}>{r.login?.trim() ? r.login : "VAGO"}</Badge></td>
                      {extras.map((e) => <td key={e} className="text-muted">{r[e] || ""}</td>)}
                      <td className="whitespace-nowrap text-xs text-muted">{r.data}</td>
                      <td className="max-w-[200px] truncate text-xs text-muted" title={r.obs}>{r.obs || ""}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconBtn title="Editar" onClick={() => setModal({ type: "form", record: r })} icon={Pencil} />
                          <IconBtn title="Histórico" onClick={() => setModal({ type: "hist", record: r })} icon={History} />
                          <IconBtn title="Excluir" onClick={() => excluir(r)} icon={Trash2} danger />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Paginação */}
      {totalPags > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <PageBtn onClick={() => setPagina(1)} disabled={pagAtual === 1} icon={ChevronsLeft} />
          <PageBtn onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagAtual === 1} icon={ChevronLeft} />
          {Array.from({ length: totalPags }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - pagAtual) <= 2 || p === 1 || p === totalPags)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={"e" + i} className="px-2 text-muted">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={cn(
                    "min-w-9 rounded-lg border px-3 py-1.5 text-sm transition",
                    p === pagAtual
                      ? "border-primary bg-primary text-primary-fg font-bold"
                      : "border-border bg-surface text-text-soft hover:border-border-strong"
                  )}
                >
                  {p}
                </button>
              )
            )}
          <PageBtn onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagAtual === totalPags} icon={ChevronRight} />
          <PageBtn onClick={() => setPagina(totalPags)} disabled={pagAtual === totalPags} icon={ChevronsRight} />
          <span className="ml-2 text-sm text-muted">{filtrados.length} registros</span>
        </div>
      )}

      {/* Modais */}
      {modal?.type === "form" && (
        <IPFormModal cidade={cidade} initial={modal.record} onClose={() => setModal(null)} onSave={salvar} />
      )}
      {modal?.type === "bulk" && (
        <BulkImportModal cidade={cidade} onClose={() => setModal(null)} onDone={() => {}} />
      )}
      {modal?.type === "gen" && (
        <GenerateBlockModal cidade={cidade} onClose={() => setModal(null)} onDone={() => {}} />
      )}
      {modal?.type === "hist" && (
        <HistoryModal ip={modal.record.ip} cidade={toKey(cidade)} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-2",
        danger ? "hover:border-red-500/40 hover:text-red-500" : "hover:text-primary"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PageBtn({ icon: Icon, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:border-border-strong disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
