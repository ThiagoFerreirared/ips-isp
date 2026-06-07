import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Plus, Minus, Settings, FileSpreadsheet, FileText, Pencil, Trash2, Share2, Building2,
} from "lucide-react";
import { db } from "../firebase/config";
import { useCollection } from "../hooks/useCollection";
import { useDocument } from "../hooks/useDocument";
import { useToast } from "../context/ToastContext";
import { Card, Button, Input, Select, Field, Modal, Loading, EmptyState } from "../components/ui";

const COL_LINKS = "relatorio_links";
const EMPRESA_DEFAULT = {
  nome: "WSP SERVIÇOS DE TELECOMUNICAÇÕES LTDA",
  endereco: "RUA SÃO LUIZ, 164, AEROPORTO VELHO, 68020-060, SANTARÉM-PA",
  email: "noc@wsp.net.br",
  cnpj: "07.942.413/0001-34",
  noc: "93-3512-0115",
  callcenter: "93-3512-0112",
  oscar: "93 99116-7940",
};

const toArr = (v) => (!v ? [""] : Array.isArray(v) ? (v.length ? v : [""]) : [v]);

/* ───────── MultiInput ───────── */
function MultiInput({ label, values, onChange }) {
  const update = (i, v) => onChange(values.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...values, ""]);
  const remove = (i) => values.length > 1 && onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <span className="label">{label}</span>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input value={v} onChange={(e) => update(i, e.target.value)} />
            {values.length > 1 && (
              <Button variant="soft" size="icon" onClick={() => remove(i)} type="button"><Minus className="h-4 w-4" /></Button>
            )}
            {i === values.length - 1 && (
              <Button variant="soft" size="icon" onClick={add} type="button"><Plus className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Modais ───────── */
function LinkModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    nome: initial?.nome || "",
    capacidade: initial?.capacidade || "",
    tipo: initial?.tipo || "TRANSPORTE",
    operadora: initial?.operadora || "",
    circuitos: toArr(initial?.circuitos || initial?.circuito),
    telefones: toArr(initial?.telefones || initial?.telefone),
    contato: initial?.contato || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      title={initial ? "Editar link" : "Novo link"}
      icon={Share2}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave(form)}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tipo">
          <Select value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
            <option value="TRANSPORTE">Link de Transporte</option>
            <option value="IP">Link IP</option>
          </Select>
        </Field>
        {[["nome", "Nome do link"], ["capacidade", "Capacidade (ex: 20GB)"], ["operadora", "Operadora"]].map(([k, l]) => (
          <Field key={k} label={l}>
            <Input value={form[k]} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
        <MultiInput label="Circuito(s)" values={form.circuitos} onChange={(v) => set("circuitos", v)} />
        <MultiInput label="Telefone(s)" values={form.telefones} onChange={(v) => set("telefones", v)} />
        <Field label="Outros canais de atendimento">
          <Input value={form.contato} onChange={(e) => set("contato", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function EmpresaModal({ empresa, onClose, onSave }) {
  const [form, setForm] = useState({ ...empresa });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const campos = [
    ["nome", "Nome da empresa"], ["endereco", "Endereço"], ["email", "Email NOC"],
    ["cnpj", "CNPJ"], ["noc", "Telefone NOC"], ["callcenter", "Callcenter"], ["oscar", "Oscar / Contato"],
  ];
  return (
    <Modal
      title="Dados da empresa"
      icon={Settings}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave(form)}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {campos.map(([k, l]) => (
          <Field key={k} label={l}>
            <Input value={form[k] || ""} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

/* ───────── Página ───────── */
export default function RelatorioLinks() {
  const toast = useToast();
  const empresaDoc = useDocument("config", "empresa");
  const { data: links, loading } = useCollection(COL_LINKS);
  const empresa = empresaDoc.data || EMPRESA_DEFAULT;

  const [modal, setModal] = useState(null); // {type, record}

  async function salvarEmpresa(form) {
    await setDoc(doc(db, "config", "empresa"), form);
    toast.success("Dados da empresa salvos.");
    setModal(null);
  }

  async function salvarLink(form) {
    if (!form.nome?.trim()) return toast.error("Informe o nome do link.");
    const payload = {
      ...form,
      circuitos: form.circuitos.filter((v) => v.trim()),
      telefones: form.telefones.filter((v) => v.trim()),
    };
    try {
      if (modal?.record) await updateDoc(doc(db, COL_LINKS, modal.record.id), payload);
      else await addDoc(collection(db, COL_LINKS), payload);
      toast.success("Link salvo.");
      setModal(null);
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  }

  async function excluirLink(id) {
    const ok = await toast.confirm({ title: "Excluir link", message: "Excluir este link?", confirmLabel: "Excluir", danger: true });
    if (!ok) return;
    await deleteDoc(doc(db, COL_LINKS, id));
    toast.success("Link excluído.");
  }

  function exportarExcel() {
    const transporte = links.filter((l) => l.tipo === "TRANSPORTE");
    const ip = links.filter((l) => l.tipo === "IP");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["LINKS DE TRANSPORTE", "CAPACIDADE"], ...transporte.map((l) => [l.nome, l.capacidade]),
      [], ["LINKS IP", "CAPACIDADE"], ...ip.map((l) => [l.nome, l.capacidade]),
    ]), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["OPERADORA", "CIRCUITO", "TELEFONE", "OUTROS CANAIS"],
      ...links.map((l) => [l.operadora || "", toArr(l.circuitos || l.circuito).join(" / "), toArr(l.telefones || l.telefone).join(" / "), l.contato || ""]),
    ]), "Circuitos");
    XLSX.writeFile(wb, "relatorio_links.xlsx");
  }

  function exportarPDF() {
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(12); pdf.text(empresa.nome, 14, 14);
    pdf.setFontSize(9);
    pdf.text(`${empresa.endereco} | ${empresa.email} | CNPJ: ${empresa.cnpj}`, 14, 20);
    pdf.text(`NOC: ${empresa.noc} | Callcenter: ${empresa.callcenter} | Oscar: ${empresa.oscar}`, 14, 25);
    const head = [["NOME", "CAPACIDADE", "OPERADORA", "CIRCUITO", "TELEFONE", "CONTATO"]];
    const body = (tipo) => links.filter((l) => l.tipo === tipo).map((l) => [
      l.nome || "", l.capacidade || "", l.operadora || "",
      toArr(l.circuitos || l.circuito).join("\n"), toArr(l.telefones || l.telefone).join("\n"), l.contato || "",
    ]);
    pdf.setFontSize(10); pdf.text("LINKS DE TRANSPORTE", 14, 34);
    autoTable(pdf, { startY: 37, head, body: body("TRANSPORTE"), styles: { fontSize: 8 } });
    pdf.text("LINKS IP", 14, pdf.lastAutoTable.finalY + 8);
    autoTable(pdf, { startY: pdf.lastAutoTable.finalY + 11, head, body: body("IP"), styles: { fontSize: 8 } });
    pdf.save("relatorio_links.pdf");
  }

  const grupos = [
    { tipo: "TRANSPORTE", titulo: "Links de Transporte", lista: links.filter((l) => l.tipo === "TRANSPORTE") },
    { tipo: "IP", titulo: "Links IP", lista: links.filter((l) => l.tipo === "IP") },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-text">Relatório de Links</h1>
        <p className="text-sm text-muted">Links de transporte e IP, contatos e operadoras</p>
      </div>

      {/* Empresa */}
      <Card className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="flex gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold text-text">{empresa.nome}</div>
            <div className="mt-1 text-sm leading-relaxed text-muted">
              {empresa.endereco}<br />
              {empresa.email} · CNPJ: {empresa.cnpj}<br />
              NOC: {empresa.noc} · Callcenter: {empresa.callcenter} · Oscar: {empresa.oscar}
            </div>
          </div>
        </div>
        <Button variant="soft" size="sm" onClick={() => setModal({ type: "empresa" })}>
          <Settings className="h-4 w-4" /> Editar
        </Button>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" onClick={() => setModal({ type: "link", record: null })}><Plus className="h-4 w-4" /> Novo link</Button>
        <Button size="sm" variant="success" onClick={exportarExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        <Button size="sm" variant="orange" onClick={exportarPDF}><FileText className="h-4 w-4" /> PDF</Button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grupos.map(({ tipo, titulo, lista }) => (
            <Card key={tipo} className="overflow-hidden">
              <div className="border-b border-border bg-surface-2 px-5 py-3 text-sm font-semibold text-text">
                {titulo} <span className="ml-1 text-muted">({lista.length})</span>
              </div>
              {lista.length === 0 ? (
                <EmptyState icon={Share2} title="Nenhum link" desc="Cadastre um link para começar." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th><th>Cap.</th><th>Operadora</th><th>Circuito(s)</th><th>Telefone(s)</th><th className="text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((l) => (
                        <tr key={l.id}>
                          <td className="font-semibold text-text">{l.nome}</td>
                          <td className="font-medium text-amber-500">{l.capacidade}</td>
                          <td className="text-muted">{l.operadora || "—"}</td>
                          <td className="text-muted">{toArr(l.circuitos || l.circuito).map((c, i) => <div key={i}>{c || "—"}</div>)}</td>
                          <td className="text-muted">{toArr(l.telefones || l.telefone).map((t, i) => <div key={i}>{t || "—"}</div>)}</td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setModal({ type: "link", record: l })} title="Editar"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted transition hover:text-primary hover:bg-surface-2">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => excluirLink(l.id)} title="Excluir"
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
          ))}
        </div>
      )}

      {modal?.type === "link" && (
        <LinkModal initial={modal.record} onClose={() => setModal(null)} onSave={salvarLink} />
      )}
      {modal?.type === "empresa" && (
        <EmpresaModal empresa={empresa} onClose={() => setModal(null)} onSave={salvarEmpresa} />
      )}
    </div>
  );
}
