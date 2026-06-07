import React, { useState, useMemo } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText, CalendarClock } from "lucide-react";
import { db } from "../firebase/config";
import { useCollection } from "../hooks/useCollection";
import { useToast } from "../context/ToastContext";
import { Card, Button, Input, Select, Field, Modal, Loading, EmptyState } from "../components/ui";
import { cn } from "../lib/cn";

const COL = "historico_eventos";
const COL_LINKS = "relatorio_links";
const STATUS_OPTS = ["DEGRADAÇÃO", "INDISPONÍVEL", "NORMALIZADO"];

const STATUS_STYLE = {
  INDISPONÍVEL: "bg-red-500/15 text-red-400",
  DEGRADAÇÃO: "bg-amber-500/15 text-amber-400",
  NORMALIZADO: "bg-emerald-500/15 text-emerald-400",
};
const statusClass = (s) => STATUS_STYLE[(s || "").toUpperCase()] || STATUS_STYLE.NORMALIZADO;

const toISO = (d) => (/^\d{2}\/\d{2}\/\d{4}$/.test(d || "") ? d.split("/").reverse().join("-") : d || "");
const fmtDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d.split("-").reverse().join("/") : d || "");

function EventoModal({ initial, onClose, onSave, linksTransporte, linksIP }) {
  const [form, setForm] = useState(
    initial || { data: "", status: "DEGRADAÇÃO", protocolo: "", tipo_link: "", operadora: "", hora_inicio: "", hora_termino: "", evento: "" }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const opcoes = form.tipo_link === "TRANSPORTE" ? linksTransporte : form.tipo_link === "IP" ? linksIP : [];

  function handleTipo(v) {
    const novas = v === "TRANSPORTE" ? linksTransporte : v === "IP" ? linksIP : [];
    setForm((f) => ({ ...f, tipo_link: v, operadora: novas.includes(f.operadora) ? f.operadora : "" }));
  }

  function submit() {
    const operadora = form.operadora === "__outro__" ? (form.operadora_custom || "").trim() : form.operadora;
    onSave({ ...form, operadora });
  }

  return (
    <Modal
      title={initial ? "Editar evento" : "Novo evento"}
      icon={CalendarClock}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit}>Salvar</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Data"><Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Protocolo"><Input value={form.protocolo} onChange={(e) => set("protocolo", e.target.value)} /></Field>
        <Field label="Tipo de link">
          <Select value={form.tipo_link} onChange={(e) => handleTipo(e.target.value)}>
            <option value="">Selecione…</option>
            <option value="TRANSPORTE">Link de Transporte</option>
            <option value="IP">Link IP</option>
          </Select>
        </Field>

        {form.tipo_link && (
          <Field label="Operadora" className="col-span-2">
            <Select value={form.operadora} onChange={(e) => set("operadora", e.target.value)}>
              <option value="">Selecione a operadora…</option>
              {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
              <option value="__outro__">➕ Outra (digitar)</option>
            </Select>
            {form.operadora === "__outro__" && (
              <Input className="mt-2" placeholder="Nome da operadora" value={form.operadora_custom || ""} onChange={(e) => set("operadora_custom", e.target.value)} />
            )}
          </Field>
        )}

        <Field label="Hora de início"><Input type="time" value={form.hora_inicio} onChange={(e) => set("hora_inicio", e.target.value)} /></Field>
        <Field label="Hora de término"><Input type="time" value={form.hora_termino} onChange={(e) => set("hora_termino", e.target.value)} /></Field>
        <Field label="Evento" className="col-span-2"><Input value={form.evento} onChange={(e) => set("evento", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function HistoricoEventos() {
  const toast = useToast();
  const { data: eventos, loading } = useCollection(COL);
  const { data: links } = useCollection(COL_LINKS);

  const [modal, setModal] = useState(null);
  const [fStatus, setFStatus] = useState("TODOS");
  const [fTipo, setFTipo] = useState("TODOS");
  const [fOp, setFOp] = useState("");

  const linksTransporte = useMemo(
    () => [...new Set(links.filter((l) => l.tipo === "TRANSPORTE" && l.operadora).map((l) => l.operadora))].sort(),
    [links]
  );
  const linksIP = useMemo(
    () => [...new Set(links.filter((l) => l.tipo === "IP" && l.operadora).map((l) => l.operadora))].sort(),
    [links]
  );

  const ordenados = useMemo(
    () => [...eventos].sort((a, b) => toISO(b.data).localeCompare(toISO(a.data))),
    [eventos]
  );
  const operadoras = useMemo(() => [...new Set(eventos.map((e) => e.operadora).filter(Boolean))], [eventos]);

  const filtrados = ordenados.filter((e) => {
    const mOp = !fOp || e.operadora === fOp;
    const mStatus = fStatus === "TODOS" || e.status === fStatus;
    const mTipo = fTipo === "TODOS" || e.tipo_link === fTipo;
    return mOp && mStatus && mTipo;
  });

  async function salvar(form) {
    if (!form.data) return toast.error("Informe a data.");
    const { operadora_custom, ...payload } = form;
    try {
      if (modal?.record) await updateDoc(doc(db, COL, modal.record.id), payload);
      else await addDoc(collection(db, COL), { ...payload, timestamp: serverTimestamp() });
      toast.success("Evento salvo.");
      setModal(null);
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  }

  async function excluir(id) {
    const ok = await toast.confirm({ title: "Excluir evento", message: "Excluir este evento?", confirmLabel: "Excluir", danger: true });
    if (!ok) return;
    await deleteDoc(doc(db, COL, id));
    toast.success("Evento excluído.");
  }

  function exportarExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["DATA", "STATUS", "TIPO LINK", "PROTOCOLO", "OPERADORA", "HORA INÍCIO", "HORA TÉRMINO", "EVENTO"],
      ...filtrados.map((e) => [fmtDate(e.data), e.status, e.tipo_link || "", e.protocolo, e.operadora, e.hora_inicio, e.hora_termino, e.evento]),
    ]), "Histórico");
    XLSX.writeFile(wb, "historico_eventos.xlsx");
  }

  function exportarPDF() {
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(13); pdf.text("Histórico de Eventos", 14, 14);
    autoTable(pdf, {
      startY: 20,
      head: [["DATA", "STATUS", "TIPO", "PROTOCOLO", "OPERADORA", "INÍCIO", "TÉRMINO", "EVENTO"]],
      body: filtrados.map((e) => [fmtDate(e.data), e.status, e.tipo_link || "", e.protocolo, e.operadora, e.hora_inicio, e.hora_termino, e.evento]),
      styles: { fontSize: 8 },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 1) {
          const v = (d.cell.raw || "").toUpperCase();
          if (v === "INDISPONÍVEL") d.cell.styles.fillColor = [254, 202, 202];
          else if (v === "DEGRADAÇÃO") d.cell.styles.fillColor = [254, 243, 199];
        }
      },
    });
    pdf.save("historico_eventos.pdf");
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-text">Histórico de Eventos</h1>
        <p className="text-sm text-muted">Registro de degradações, indisponibilidades e normalizações</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="sm" onClick={() => setModal({ type: "evento", record: null })}><Plus className="h-4 w-4" /> Novo evento</Button>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="w-auto">
          <option value="TODOS">Todos os status</option>
          {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className="w-auto">
          <option value="TODOS">Todos os tipos</option>
          <option value="TRANSPORTE">Transporte</option>
          <option value="IP">IP</option>
        </Select>
        <Select value={fOp} onChange={(e) => setFOp(e.target.value)} className="w-auto">
          <option value="">Todas operadoras</option>
          {operadoras.map((o) => <option key={o}>{o}</option>)}
        </Select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="success" onClick={exportarExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button size="sm" variant="orange" onClick={exportarPDF}><FileText className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Loading />
        ) : filtrados.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum evento" desc="Registre um evento para começar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th><th>Data</th><th>Status</th><th>Tipo</th><th>Protocolo</th>
                  <th>Operadora</th><th>Início</th><th>Término</th><th>Evento</th><th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e, i) => (
                  <tr key={e.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="whitespace-nowrap font-medium text-text">{fmtDate(e.data)}</td>
                    <td><span className={cn("badge", statusClass(e.status))}>{e.status}</span></td>
                    <td>
                      {e.tipo_link && (
                        <span className={cn("badge", e.tipo_link === "TRANSPORTE" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400")}>
                          {e.tipo_link}
                        </span>
                      )}
                    </td>
                    <td className="text-muted">{e.protocolo}</td>
                    <td className="font-medium text-text-soft">{e.operadora}</td>
                    <td className="text-muted">{e.hora_inicio}</td>
                    <td className="text-muted">{e.hora_termino}</td>
                    <td className="max-w-[220px] truncate text-muted" title={e.evento}>{e.evento}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ type: "evento", record: e })} title="Editar"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted transition hover:text-primary hover:bg-surface-2">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => excluir(e.id)} title="Excluir"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted transition hover:border-red-500/40 hover:text-red-500 hover:bg-surface-2">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal?.type === "evento" && (
        <EventoModal
          initial={modal.record}
          onClose={() => setModal(null)}
          onSave={salvar}
          linksTransporte={linksTransporte}
          linksIP={linksIP}
        />
      )}
    </div>
  );
}
