import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Zap, Download, FileSpreadsheet, Search, Pencil, History, Trash2, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Network, CheckCircle2, CircleSlash,
} from "lucide-react";
import { saveIP, deleteIP, migrateManaus } from "../lib/ipStore";
import { useDocument } from "../hooks/useDocument";
import { subnetOptions, inSubnet, expandConfiguredBlocks } from "../lib/subnets";
import SubnetLoginModal from "../components/ip/SubnetLoginModal";
import BlocksModal from "../components/ip/BlocksModal";
import { useCities } from "../context/CitiesContext";
import { useToast } from "../context/ToastContext";
import { useCollection } from "../hooks/useCollection";
import { classifyLogin } from "../lib/classify";
import { exportIPsExcel } from "../lib/exports";
import { colName, toKey, listCityIPs, normalizeIPRecord } from "../lib/ip";
import { extrasFor } from "../lib/cities";
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
  const { cidades, cidadeLabel } = useCities();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const cidade = params.get("cidade") || cidades[0] || "";
  const setCidade = (c) => setParams({ cidade: c });

  const colKey = cidade ? colName(cidade) : null;
  const extras = extrasFor(cidade);
  const { data, loading } = useCollection(colKey);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [prefix, setPrefix] = useState(24);
  const blockConfig = useDocument("config", "blocos_" + toKey(cidade));
  const [migrating, setMigrating] = useState(false);
  const [bloco, setBloco] = useState("TODOS");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null); // {type, record}

  useEffect(() => {
    setBusca(""); setFiltro("TODOS"); setBloco("TODOS"); setPrefix(24); setPagina(1);
  }, [cidade]);

  const configured = blockConfig.data?.blocks;
  const registros = useMemo(() => configured?.length ? expandConfiguredBlocks(data.map((r) => normalizeIPRecord(r, cidade)), configured) : listCityIPs(data, cidade), [data, cidade, configured]);
  const blocos = useMemo(() => subnetOptions(registros, prefix), [registros, prefix]);
  const needsMigration = cidade === "MANAUS" && data.some((r) => normalizeIPRecord(r, cidade) !== r);

  const filtrados = useMemo(
    () =>
      registros.filter((r) => {
        const txt = busca.toLowerCase();
        const mBusca =
          !txt ||
          r.ip?.toLowerCase().includes(txt) ||
          r.login?.toLowerCase().includes(txt) ||
          r.obs?.toLowerCase().includes(txt);
        const tipo = r.virtual ? "nao_cadastrado" : classifyLogin(r.login);
        const mFiltro =
          filtro === "TODOS" || tipo === filtro || (filtro === "USADO" && !r.virtual && !["vago", "reservado"].includes(tipo));
        const mBloco = bloco === "TODOS" || inSubnet(r.ip, bloco);
        return mBusca && mFiltro && mBloco;
      }),
    [registros, busca, filtro, bloco]
  );

  const totalPags = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pagAtual = Math.min(pagina, totalPags);
  const slice = filtrados.slice((pagAtual - 1) * PAGE_SIZE, pagAtual * PAGE_SIZE);

  const vagos = useMemo(() => registros.filter((r) => !r.virtual && classifyLogin(r.login) === "vago").length, [registros]);
  const naoCadastrados = registros.filter((r) => r.virtual).length;
  const reservados = registros.filter((r) => !r.virtual && classifyLogin(r.login) === "reservado").length;
  const usados = registros.length - vagos - naoCadastrados - reservados;

  /* ───────── ações ───────── */
  async function salvar(form) {
    const editando = modal?.record;
    try {
      await saveIP(cidade, form, editando && !editando.virtual ? editando.id : null);
      toast.success("Registro salvo.");
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
      await deleteIP(cidade, r.id);
      toast.success("IP excluído.");
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  }

  async function corrigirManaus() {
    if (migrating) return;
    setMigrating(true);
    try { const count = await migrateManaus(); toast.success(count + " registros corrigidos com backup e histórico."); }
    catch (error) { toast.error("Correção interrompida: " + error.message); }
    finally { setMigrating(false); }
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={Network} label="Total listado" value={registros.length} color="#38bdf8" />
        <StatCard icon={CheckCircle2} label="Usados" value={usados} color="#22c55e" />
        <StatCard icon={CircleSlash} label="Vagos" value={vagos} color="#f59e0b" />
        <StatCard icon={CircleSlash} label="Reservados" value={reservados} color="#a78bfa" />
        {naoCadastrados > 0 && <StatCard icon={CircleSlash} label="Não cadastrados" value={naoCadastrados} color="#94a3b8" />}
      </div>
      {naoCadastrados > 0 && <p className="text-sm text-muted">A lista inclui os blocos configurados ou blocos /24 detectados, com endereços sem cadastro. Confirme o uso antes de atribuí-los.</p>}

      {needsMigration && <div className="card flex flex-wrap items-center gap-3 p-3 text-sm"><span className="flex-1">Há registros antigos com IP e login invertidos. A correção salva os originais no backup e registra o histórico.</span><Button size="sm" onClick={corrigirManaus} disabled={migrating}>{migrating ? "Corrigindo…" : "Corrigir Manaus com backup"}</Button></div>}

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
          <option value="reservado">Reservados</option>
          {naoCadastrados > 0 && <option value="nao_cadastrado">Não cadastrados</option>}
          <option value="USADO">Usados</option>
          <option value="equip">Equipamentos</option>
          <option value="cgnat">CGNAT</option>
          <option value="cliente">Clientes</option>
        </Select>

        <Select aria-label="Máscara do filtro" value={prefix} onChange={(e) => { setPrefix(Number(e.target.value)); setBloco("TODOS"); setPagina(1); }} className="w-auto">
          {[24,25,26,27,28,29,30,31,32].map((p) => <option key={p} value={p}>Máscara /{p}</option>)}
        </Select>
        <Select aria-label="Sub-rede" value={bloco} onChange={(e) => { setBloco(e.target.value); setPagina(1); }} className="w-auto">
          <option value="TODOS">Todas as sub-redes</option>
          {blocos.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="soft" onClick={() => setModal({ type: "blocks" })}>Blocos da cidade</Button>
          <Button size="sm" onClick={() => setModal({ type: "form", record: null })}><Plus className="h-4 w-4" /> Novo IP</Button>
          <Button size="sm" variant="success" onClick={() => setModal({ type: "gen" })}><Zap className="h-4 w-4" /> Gerar bloco</Button>
          <Button size="sm" variant="purple" onClick={() => setModal({ type: "bulk" })}><Download className="h-4 w-4" /> Importar</Button>
          <Button size="sm" variant="soft" onClick={() => exportIPsExcel(filtrados, cidade, extras)}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        </div>
      </div>

      {bloco !== "TODOS" && [28, 29, 30].includes(prefix) && <div className="card flex flex-wrap items-center gap-3 p-3"><span className="flex-1 text-sm">Bloco {bloco} · {2 ** (32 - prefix)} IPs</span><Button size="sm" disabled={loading || blockConfig.loading} onClick={() => setModal({ type: "subnet-login", cidade, cidr: bloco, release: false })}>Aplicar login ao bloco</Button><Button size="sm" variant="soft" disabled={loading || blockConfig.loading} onClick={() => setModal({ type: "subnet-login", cidade, cidr: bloco, release: true })}>Liberar bloco</Button></div>}

      {/* Tabela */}
      <Card className="overflow-hidden">
        {loading || blockConfig.loading ? (
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
                  const tipo = r.virtual ? "nao_cadastrado" : classifyLogin(r.login);
                  return (
                    <tr key={r.id} style={{ background: ROW_TINT[tipo] }}>
                      <td className="text-muted">{(pagAtual - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <button onClick={() => copiar(r.ip)} className="ip-mono group inline-flex items-center gap-1.5" title="Copiar IP">
                          {r.ip}
                          <Copy className="h-3 w-3 text-muted opacity-0 transition group-hover:opacity-100" />
                        </button>
                      </td>
                      <td>{r.virtual ? <span className="text-xs text-muted">Não cadastrado</span> : <Badge tipo={tipo}>{r.login?.trim() ? r.login : "VAGO"}</Badge>}</td>
                      {extras.map((e) => <td key={e} className="text-muted">{r[e] || ""}</td>)}
                      <td className="whitespace-nowrap text-xs text-muted">{r.data}</td>
                      <td className="max-w-[200px] truncate text-xs text-muted" title={r.obs}>{r.obs || ""}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconBtn title={r.virtual ? "Cadastrar IP" : "Editar"} onClick={() => setModal({ type: "form", record: r })} icon={Pencil} />
                          {!r.virtual && <IconBtn title="Histórico" onClick={() => setModal({ type: "hist", record: r })} icon={History} />}
                          {!r.virtual && <IconBtn title="Excluir" onClick={() => excluir(r)} icon={Trash2} danger />}
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
      {modal?.type === "subnet-login" && <SubnetLoginModal cidade={modal.cidade} cityName={cidadeLabel(modal.cidade)} cidr={modal.cidr} records={data} release={modal.release} onClose={() => setModal(null)} onDone={() => { setModal(null); setBusca(""); setFiltro("TODOS"); setPagina(1); }} />}
      {modal?.type === "blocks" && <BlocksModal cidade={cidade} blocks={configured} onClose={() => setModal(null)} />}
      {modal?.type === "form" && (
        <IPFormModal cidade={cidade} initial={modal.record?.virtual ? null : modal.record} seedIP={modal.record?.virtual ? modal.record.ip : ""} onClose={() => setModal(null)} onSave={salvar} />
      )}
      {modal?.type === "bulk" && (
        <BulkImportModal cidade={cidade} existing={data} onClose={() => setModal(null)} onDone={() => {}} />
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
