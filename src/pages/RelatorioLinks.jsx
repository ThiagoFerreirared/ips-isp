import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import HistoricoEventos from "./HistoricoEventos";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const DB_EMPRESA = "config";
const DOC_EMPRESA = "empresa";
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

// Helper: garante que o valor seja sempre array
function toArr(v) {
  if (!v) return [""];
  if (Array.isArray(v)) return v.length ? v : [""];
  return [v];
}

// Componente de lista dinâmica com + e -
function MultiInput({ label, values, onChange }) {
  function update(i, v) {
    const nova = [...values];
    nova[i] = v;
    onChange(nova);
  }
  function add() { onChange([...values, ""]); }
  function remove(i) {
    if (values.length === 1) return;
    onChange(values.filter((_, idx) => idx !== i));
  }
  return (
    <div>
      <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{label}</span>
      {values.map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <input
            className="search-input"
            style={{ flex: 1 }}
            value={v}
            onChange={e => update(i, e.target.value)}
          />
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              style={{
                background: "#7f1d1d", border: "none", borderRadius: 6,
                color: "#fca5a5", fontWeight: 700, fontSize: "1rem",
                width: 30, cursor: "pointer", flexShrink: 0,
              }}
            >−</button>
          )}
          {i === values.length - 1 && (
            <button
              type="button"
              onClick={add}
              style={{
                background: "#1e3a5f", border: "none", borderRadius: 6,
                color: "#60a5fa", fontWeight: 700, fontSize: "1rem",
                width: 30, cursor: "pointer", flexShrink: 0,
              }}
            >+</button>
          )}
        </div>
      ))}
    </div>
  );
}

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
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h2 style={{ marginBottom: "1rem" }}>{initial ? "Editar Link" : "Novo Link"}</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <label>Tipo
            <select className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.tipo} onChange={e => set("tipo", e.target.value)}>
              <option value="TRANSPORTE">Link de Transporte</option>
              <option value="IP">Link IP</option>
            </select>
          </label>
          {[["nome","Nome do Link"],["capacidade","Capacidade (ex: 20GB)"],["operadora","Operadora"]].map(([k,l]) => (
            <label key={k}>{l}
              <input className="search-input" style={{ width: "100%", marginTop: 4 }}
                value={form[k]} onChange={e => set(k, e.target.value)} />
            </label>
          ))}

          <MultiInput
            label="Circuito"
            values={form.circuitos}
            onChange={v => set("circuitos", v)}
          />
          <MultiInput
            label="Telefone"
            values={form.telefones}
            onChange={v => set("telefones", v)}
          />

          <label>Outros canais de atendimento
            <input className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.contato} onChange={e => set("contato", e.target.value)} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-cancel btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(form)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function EmpresaModal({ empresa, onClose, onSave }) {
  const [form, setForm] = useState({ ...empresa });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const campos = [
    ["nome","Nome da Empresa"],["endereco","Endereço"],
    ["email","Email NOC"],["cnpj","CNPJ"],
    ["noc","Telefone NOC"],["callcenter","Callcenter"],["oscar","Oscar/Contato"],
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h2 style={{ marginBottom: "1rem" }}>⚙️ Dados da Empresa</h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {campos.map(([k,l]) => (
            <label key={k}>{l}
              <input className="search-input" style={{ width: "100%", marginTop: 4 }}
                value={form[k]||""} onChange={e => set(k, e.target.value)} />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-cancel btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(form)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function RelatorioLinks() {
  const [subaba, setSubaba] = useState("links");
  const [empresa, setEmpresa] = useState(EMPRESA_DEFAULT);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const snapEmp = await getDoc(doc(db, DB_EMPRESA, DOC_EMPRESA));
        if (snapEmp.exists()) setEmpresa(snapEmp.data());
        const snapLinks = await getDocs(collection(db, COL_LINKS));
        setLinks(snapLinks.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    carregar();
  }, []);

  async function salvarEmpresa(form) {
    await setDoc(doc(db, DB_EMPRESA, DOC_EMPRESA), form);
    setEmpresa(form);
    setModal(null);
  }

  async function salvarLink(form) {
    if (!form.nome?.trim()) return alert("Informe o nome do link.");
    // Limpa campos vazios dos arrays
    const payload = {
      ...form,
      circuitos: form.circuitos.filter(v => v.trim()),
      telefones: form.telefones.filter(v => v.trim()),
    };
    if (editando) {
      await updateDoc(doc(db, COL_LINKS, editando), payload);
      setLinks(ls => ls.map(l => l.id === editando ? { ...l, ...payload } : l));
    } else {
      const ref = await addDoc(collection(db, COL_LINKS), payload);
      setLinks(ls => [...ls, { id: ref.id, ...payload }]);
    }
    setModal(null); setEditando(null);
  }

  async function excluirLink(id) {
    if (!confirm("Excluir este link?")) return;
    await deleteDoc(doc(db, COL_LINKS, id));
    setLinks(ls => ls.filter(l => l.id !== id));
  }

  function exportarExcel() {
    const transporte = links.filter(l => l.tipo === "TRANSPORTE");
    const ip = links.filter(l => l.tipo === "IP");
    const wb = XLSX.utils.book_new();
    const linhasResumo = [
      ["LINKS DE TRANSPORTE","CAPACIDADE"],
      ...transporte.map(l => [l.nome, l.capacidade]),
      [],
      ["LINKS IP","CAPACIDADE"],
      ...ip.map(l => [l.nome, l.capacidade]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhasResumo), "Resumo");
    const linhasCircuitos = [
      ["OPERADORA","CIRCUITO","TELEFONE","OUTROS CANAIS"],
      ...links.map(l => [
        l.operadora||"",
        toArr(l.circuitos || l.circuito).join(" / "),
        toArr(l.telefones || l.telefone).join(" / "),
        l.contato||"",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhasCircuitos), "Circuitos");
    XLSX.writeFile(wb, "relatorio_links.xlsx");
  }

  function exportarPDF() {
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(12);
    pdf.text(empresa.nome, 14, 14);
    pdf.setFontSize(9);
    pdf.text(`${empresa.endereco} | ${empresa.email} | CNPJ: ${empresa.cnpj}`, 14, 20);
    pdf.text(`NOC: ${empresa.noc} | Callcenter: ${empresa.callcenter} | Oscar: ${empresa.oscar}`, 14, 25);
    const transporte = links.filter(l => l.tipo === "TRANSPORTE");
    const ip = links.filter(l => l.tipo === "IP");
    pdf.setFontSize(10);
    pdf.text("LINKS DE TRANSPORTE", 14, 34);
    autoTable(pdf, {
      startY: 37,
      head: [["NOME","CAPACIDADE","OPERADORA","CIRCUITO","TELEFONE","CONTATO"]],
      body: transporte.map(l => [
        l.nome||"", l.capacidade||"", l.operadora||"",
        toArr(l.circuitos||l.circuito).join("\n"),
        toArr(l.telefones||l.telefone).join("\n"),
        l.contato||"",
      ]),
      styles: { fontSize: 8 },
    });
    pdf.text("LINKS IP", 14, pdf.lastAutoTable.finalY + 8);
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 11,
      head: [["NOME","CAPACIDADE","OPERADORA","CIRCUITO","TELEFONE","CONTATO"]],
      body: ip.map(l => [
        l.nome||"", l.capacidade||"", l.operadora||"",
        toArr(l.circuitos||l.circuito).join("\n"),
        toArr(l.telefones||l.telefone).join("\n"),
        l.contato||"",
      ]),
      styles: { fontSize: 8 },
    });
    pdf.save("relatorio_links.pdf");
  }

  const transporte = links.filter(l => l.tipo === "TRANSPORTE");
  const ip = links.filter(l => l.tipo === "IP");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", borderBottom: "1px solid #1e293b" }}>
        {[["links","📡 Links"],["historico","📅 Histórico de Eventos"]].map(([id,label]) => (
          <button key={id} onClick={() => setSubaba(id)} style={{
            padding: "6px 16px", border: "none", cursor: "pointer",
            borderRadius: "6px 6px 0 0", fontWeight: 600, fontSize: "0.88rem",
            background: subaba === id ? "#1e40af" : "transparent",
            color: subaba === id ? "#fff" : "#94a3b8",
            borderBottom: subaba === id ? "2px solid #3b82f6" : "2px solid transparent",
          }}>{label}</button>
        ))}
      </div>

      {subaba === "links" && (
        <div style={{ padding: "16px" }}>
          <div style={{
            background: "#1e293b", borderRadius: 8, padding: "14px 18px",
            marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start"
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#60a5fa", marginBottom: 4 }}>{empresa.nome}</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.7 }}>
                {empresa.endereco}<br/>
                {empresa.email} &nbsp;|&nbsp; CNPJ: {empresa.cnpj}<br/>
                NOC: {empresa.noc} &nbsp;|&nbsp; Callcenter: {empresa.callcenter} &nbsp;|&nbsp; Oscar: {empresa.oscar}
              </div>
            </div>
            <button className="btn btn-edit btn-sm" onClick={() => setModal("empresa")}>⚙️ Editar</button>
          </div>

          <div className="toolbar" style={{ marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setModal("link"); }}>+ Novo Link</button>
            <button className="btn btn-success btn-sm" onClick={exportarExcel}>📊 Exportar Excel</button>
            <button className="btn btn-orange btn-sm" onClick={exportarPDF}>📄 Exportar PDF</button>
          </div>

          {loading ? <div className="loading">Carregando...</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["TRANSPORTE","🔗 Links de Transporte", transporte],["IP","🌐 Links IP", ip]].map(([tipo, titulo, lista]) => (
                <div key={tipo} style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ background: "#1e3a5f", padding: "8px 14px", fontWeight: 700, fontSize: "0.88rem", color: "#93c5fd" }}>
                    {titulo}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#0f172a" }}>
                        {["Nome","Capacidade","Operadora","Circuito(s)","Telefone(s)",""].map((h,i) => (
                          <th key={i} style={{ padding: "6px 10px", fontSize: "0.75rem", color: "#64748b", textAlign: "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lista.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: "12px", color: "#475569", textAlign: "center" }}>Nenhum link cadastrado.</td></tr>
                      )}
                      {lista.map(l => (
                        <tr key={l.id} style={{ borderBottom: "1px solid #0f172a" }}>
                          <td style={{ padding: "6px 10px", fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>{l.nome}</td>
                          <td style={{ padding: "6px 10px", fontSize: "0.82rem", color: "#fbbf24" }}>{l.capacidade}</td>
                          <td style={{ padding: "6px 10px", fontSize: "0.82rem", color: "#94a3b8" }}>{l.operadora||"—"}</td>
                          <td style={{ padding: "6px 10px", fontSize: "0.82rem", color: "#94a3b8" }}>
                            {toArr(l.circuitos||l.circuito).map((c,i) => <div key={i}>{c||"—"}</div>)}
                          </td>
                          <td style={{ padding: "6px 10px", fontSize: "0.82rem", color: "#94a3b8" }}>
                            {toArr(l.telefones||l.telefone).map((t,i) => <div key={i}>{t||"—"}</div>)}
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="btn btn-edit" style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                                onClick={() => { setEditando(l.id); setModal("link"); }}>✏️</button>
                              <button className="btn btn-danger" style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                                onClick={() => excluirLink(l.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subaba === "historico" && <HistoricoEventos />}

      {modal === "link" && (
        <LinkModal
          initial={editando ? links.find(l => l.id === editando) : null}
          onClose={() => { setModal(null); setEditando(null); }}
          onSave={salvarLink}
        />
      )}
      {modal === "empresa" && (
        <EmpresaModal empresa={empresa} onClose={() => setModal(null)} onSave={salvarEmpresa} />
      )}
    </div>
  );
}
