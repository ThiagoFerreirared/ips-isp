import React, { useState } from "react";
import { collection, doc, runTransaction, serverTimestamp, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { Plus, Pencil, Trash2, ClipboardList, FileSpreadsheet } from "lucide-react";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useCities } from "../context/CitiesContext";
import { useToast } from "../context/ToastContext";
import { useCollection } from "../hooks/useCollection";
import { Card, Button, Input, Select, Textarea, Field, Modal, Loading, EmptyState } from "../components/ui";
import { OCCURRENCE_STATUS, nowLocal, occurrencePayload, formatOccurrenceDate, filterOccurrences } from "../lib/occurrences";

const COL = "ocorrencias";
const COLORS = { ABERTA: "bg-red-500/15 text-red-400", "EM ATENDIMENTO": "bg-amber-500/15 text-amber-400", RESOLVIDA: "bg-emerald-500/15 text-emerald-400" };

function OccurrenceModal({ initial, onClose, onSave, cities, cityLabel }) {
  const [form, setForm] = useState(initial || { cidade: "", olt: "", cto: "", motivo: "", protocolo: "", inicio: nowLocal(), fim: "", status: "ABERTA", responsavel: "", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    try {
      const payload = occurrencePayload(form);
      setSaving(true);
      await onSave(payload);
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }
  return <Modal size="lg" title={initial ? "Editar ocorrência" : "Nova ocorrência"} icon={ClipboardList} onClose={() => { if (!saving) onClose(); }} footer={<><Button variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" form="occurrence-form" disabled={saving}>{saving ? "Salvando…" : "Salvar ocorrência"}</Button></>}>
    <form id="occurrence-form" onSubmit={submit}><fieldset disabled={saving} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <Field label="Cidade *"><Select aria-label="Cidade da ocorrência" required value={form.cidade} onChange={(e) => set("cidade", e.target.value)}><option value="">Selecione…</option>{[...new Set([...cities, form.cidade].filter(Boolean))].map((c) => <option key={c} value={c}>{cityLabel(c)}</option>)}</Select></Field>
      <Field label="Status"><Select aria-label="Status da ocorrência" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value, fim: e.target.value === "RESOLVIDA" ? f.fim || nowLocal() : "" }))}>{OCCURRENCE_STATUS.map((s) => <option key={s}>{s}</option>)}</Select></Field>
      <Field label="OLT / PON"><Textarea aria-label="OLT / PON" rows={3} value={form.olt} onChange={(e) => set("olt", e.target.value)} placeholder={"OLT SANT\nPON 0/3/8"} /></Field>
      <Field label="CTO / Ramal"><Textarea aria-label="CTO / Ramal" rows={3} value={form.cto} onChange={(e) => set("cto", e.target.value)} placeholder={"RAMAL 05\nR900"} /></Field>
      <Field label="Motivo *" className="sm:col-span-2"><Textarea aria-label="Motivo" required rows={2} value={form.motivo} onChange={(e) => set("motivo", e.target.value)} placeholder="Ex.: possível rompimento, atenuação, CTO off…" /></Field>
      <Field label="Protocolo"><Input aria-label="Protocolo" type="text" value={form.protocolo} onChange={(e) => set("protocolo", e.target.value)} /></Field>
      <Field label="Responsável"><Input aria-label="Responsável" value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></Field>
      <Field label="Data e hora de abertura *"><Input aria-label="Data e hora de abertura" type="datetime-local" step="1" required value={form.inicio} onChange={(e) => set("inicio", e.target.value)} /></Field>
      {form.status === "RESOLVIDA" && <Field label="Data e hora de encerramento *"><Input aria-label="Data e hora de encerramento" type="datetime-local" step="1" required min={form.inicio} value={form.fim} onChange={(e) => set("fim", e.target.value)} /></Field>}
      <Field label="Observações / solução" className="sm:col-span-2"><Textarea aria-label="Observações / solução" rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></Field>
      <p className="text-xs text-muted sm:col-span-2">Horários de Brasília. * Campos obrigatórios.</p>
    </fieldset></form>
  </Modal>;
}

export default function Ocorrencias() {
  const [includeResolved, setIncludeResolved] = useState(false);
  const [take, setTake] = useState(50);
  const active = useCollection(COL, { statuses: ["ABERTA", "EM ATENDIMENTO"] });
  const resolved = useCollection(includeResolved ? COL : null, { statuses: ["RESOLVIDA"], take });
  const data = [...active.data, ...resolved.data];
  const loading = active.loading || resolved.loading;
  const { cidades, cidadeLabel } = useCities();
  const { user } = useAuth();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ cidade: "", status: "", search: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const filter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
  const rows = filterOccurrences(data, filters, cidadeLabel);
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  const currentPage = Math.min(page, pages);
  const cities = [...new Set([...cidades, ...data.map((r) => r.cidade)].filter(Boolean))];
  async function save(form) {
    const ref = doc(db, COL, modal.id);
    await runTransaction(db, async (tx) => {
      const current = await tx.get(ref);
      if (modal.record && !current.exists()) throw new Error("A ocorrência foi removida. Atualize a lista.");
      if (modal.record && current.data().updatedAt?.toMillis?.() !== modal.record.updatedAt?.toMillis?.()) throw new Error("Outra pessoa alterou esta ocorrência. Feche e abra novamente para editar a versão atual.");
      tx.set(ref, { ...form, updatedAt: serverTimestamp(), updatedBy: user?.email || "", ...(!current.exists() ? { createdAt: serverTimestamp(), createdBy: user?.email || "" } : {}) }, { merge: true });
    });
    toast.success("Ocorrência salva.");
    setModal(null);
  }
  async function remove(row) {
    if (!await toast.confirm({ title: "Excluir ocorrência", message: "Excluir a ocorrência " + (row.protocolo || "sem protocolo") + " de " + cidadeLabel(row.cidade) + "?", confirmLabel: "Excluir", danger: true })) return;
    setDeleting(row.id);
    try { await deleteDoc(doc(db, COL, row.id)); toast.success("Ocorrência excluída."); }
    catch (error) { toast.error("Não foi possível excluir: " + error.message); }
    finally { setDeleting(null); }
  }
  function exportExcel() {
    const sheet = XLSX.utils.aoa_to_sheet([["CIDADE", "OLT / PON", "CTO", "MOTIVO", "PROTOCOLO", "ABERTURA", "STATUS", "ENCERRAMENTO", "RESPONSÁVEL", "OBSERVAÇÕES"], ...rows.map((r) => [cidadeLabel(r.cidade), r.olt, r.cto, r.motivo, String(r.protocolo || ""), formatOccurrenceDate(r.inicio), r.status, formatOccurrenceDate(r.fim), r.responsavel, r.observacoes])]);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Ocorrências"); XLSX.writeFile(book, "ocorrencias.xlsx");
  }
  return <div className="space-y-5 p-4 md:p-6">
    <div><h1 className="text-xl font-extrabold text-text">Controle de ocorrências</h1><p className="text-sm text-muted">Acompanhe falhas por cidade, OLT e CTO até a resolução.</p></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{OCCURRENCE_STATUS.map((s) => <Card key={s} className="p-4"><div className="text-2xl font-bold">{loading ? "…" : s === "RESOLVIDA" && !includeResolved ? "—" : data.filter((r) => r.status === s).length}</div><span className={"badge " + COLORS[s]}>{s}</span></Card>)}</div>
    {(active.error || resolved.error) && <p role="alert" className="text-red-400">Não foi possível atualizar os chamados. Verifique a cota do Firebase.</p>}
    <p className="text-xs text-muted">Contadores, filtros e exportação consideram os registros carregados. Chamados ativos atualizam em tempo real.</p>
    <Button variant="soft" onClick={() => setIncludeResolved(!includeResolved)}>{includeResolved ? "Ocultar resolvidas" : "Consultar resolvidas"}</Button>
    {includeResolved && resolved.data.length >= take && <Button variant="ghost" onClick={() => setTake(take + 50)}>Carregar mais 50 resolvidas</Button>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setModal({ id: doc(collection(db, COL)).id, record: null })}><Plus className="h-4 w-4" />Nova ocorrência</Button>
      <Input className="sm:max-w-xs" aria-label="Buscar ocorrências" placeholder="Buscar protocolo, OLT, CTO, motivo…" value={filters.search} onChange={(e) => filter("search", e.target.value)} />
      <Select className="w-auto" aria-label="Filtrar cidade" value={filters.cidade} onChange={(e) => filter("cidade", e.target.value)}><option value="">Todas as cidades</option>{cities.map((c) => <option key={c} value={c}>{cidadeLabel(c)}</option>)}</Select>
      <Select className="w-auto" aria-label="Filtrar status" value={filters.status} onChange={(e) => { if (e.target.value === "RESOLVIDA") setIncludeResolved(true); filter("status", e.target.value); }}><option value="">Todos os status carregados</option>{OCCURRENCE_STATUS.map((s) => <option key={s}>{s}</option>)}</Select>
      <Field label="Abertura de"><Input aria-label="Abertura de" type="date" value={filters.from} onChange={(e) => filter("from", e.target.value)} /></Field>
      <Field label="Até"><Input aria-label="Abertura até" type="date" min={filters.from} value={filters.to} onChange={(e) => filter("to", e.target.value)} /></Field>
      <Button size="sm" variant="ghost" onClick={() => { setFilters({ cidade: "", status: "", search: "", from: "", to: "" }); setPage(1); }}>Limpar filtros</Button>
      <Button size="sm" variant="success" disabled={loading || !rows.length} onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
    </div>
    <Card className="overflow-hidden">{loading ? <Loading /> : !rows.length ? <EmptyState icon={ClipboardList} title="Nenhuma ocorrência" desc={data.length ? "Nenhum registro corresponde aos filtros." : "Clique em Nova ocorrência para começar."} /> : <div className="overflow-x-auto"><table className="data-table"><thead><tr>{["Cidade", "OLT / PON", "CTO", "Motivo", "Protocolo", "Abertura", "Status", "Encerramento", "Responsável", "Observações", "Ações"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice((currentPage - 1) * 50, currentPage * 50).map((r) => <tr key={r.id}>
      <td>{cidadeLabel(r.cidade)}</td>{["olt", "cto", "motivo"].map((k) => <td key={k} className="min-w-36 max-w-xs whitespace-pre-wrap break-words">{r[k] || "—"}</td>)}
      <td className="whitespace-nowrap font-mono text-xs">{r.protocolo || "—"}</td><td className="whitespace-nowrap">{formatOccurrenceDate(r.inicio)}</td><td><span className={"badge whitespace-nowrap " + COLORS[r.status]}>{r.status}</span></td><td className="whitespace-nowrap">{formatOccurrenceDate(r.fim)}</td><td>{r.responsavel || "—"}</td><td className="min-w-36 max-w-xs whitespace-pre-wrap break-words">{r.observacoes || "—"}</td>
      <td><div className="flex gap-2"><Button variant="ghost" size="sm" aria-label="Editar ocorrência" onClick={() => setModal({ id: r.id, record: r })}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="sm" aria-label="Excluir ocorrência" disabled={deleting === r.id} onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-red-400" /></Button></div></td>
    </tr>)}</tbody></table></div>}</Card>
    <div className="flex items-center justify-center gap-3 text-sm text-muted"><Button size="sm" variant="ghost" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span>{rows.length} ocorrências · página {currentPage} de {pages}</span><Button size="sm" variant="ghost" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>
    {modal && <OccurrenceModal initial={modal.record} cities={cities} cityLabel={cidadeLabel} onClose={() => setModal(null)} onSave={save} />}
  </div>;
}
