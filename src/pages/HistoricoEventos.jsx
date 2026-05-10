import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COL = "historico_eventos";
const COL_LINKS = "relatorio_links";
const STATUS_OPTS = ["DEGRADAÇÃO", "INDISPONÍVEL", "NORMALIZADO"];

function statusStyle(s) {
  const v = (s||"").toUpperCase();
  if (v === "INDISPONÍVEL") return { background: "#fecaca", color: "#7f1d1d" };
  if (v === "DEGRADAÇÃO")   return { background: "#fef3c7", color: "#78350f" };
  return { background: "#dcfce7", color: "#14532d" };
}

function EventoModal({ initial, onClose, onSave, linksTransporte, linksIP }) {
  const [form, setForm] = useState(initial || {
    data: "", status: "DEGRADAÇÃO", protocolo: "",
    tipo_link: "", operadora: "", hora_inicio: "", hora_termino: "", evento: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Monta lista de operadoras conforme tipo selecionado
  const opcoesOperadora = form.tipo_link === "TRANSPORTE"
    ? linksTransporte
    : form.tipo_link === "IP"
    ? linksIP
    : [];

  function handleTipoLink(v) {
    // Ao mudar tipo, reset operadora se não pertencer ao novo tipo
    const novasOps = v === "TRANSPORTE" ? linksTransporte : v === "IP" ? linksIP : [];
    const novaOp = novasOps.includes(form.operadora) ? form.operadora : "";
    setForm(f => ({ ...f, tipo_link: v, operadora: novaOp }));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2 style={{ marginBottom: "1rem" }}>{initial ? "Editar Evento" : "Novo Evento"}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

          <label>Data
            <input type="date" className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.data} onChange={e => set("data", e.target.value)} />
          </label>
          <label>Status
            <select className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.status} onChange={e => set("status", e.target.value)}>
              {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label>Protocolo
            <input className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.protocolo} onChange={e => set("protocolo", e.target.value)} />
          </label>

          {/* Tipo de link — ocupa a coluna da direita */}
          <label>Tipo de Link
            <select
              className="search-input"
              style={{ width: "100%", marginTop: 4 }}
              value={form.tipo_link}
              onChange={e => handleTipoLink(e.target.value)}
            >
              <option value="">Selecione…</option>
              <option value="TRANSPORTE">Link de Transporte</option>
              <option value="IP">Link IP</option>
            </select>
          </label>

          {/* Operadora aparece só quando tipo foi escolhido */}
          {form.tipo_link && (
            <label style={{ gridColumn: "1 / -1" }}>Operadora
              <select
                className="search-input"
                style={{ width: "100%", marginTop: 4 }}
                value={form.operadora}
                onChange={e => set("operadora", e.target.value)}
              >
                <option value="">Selecione a operadora…</option>
                {opcoesOperadora.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="__outro__">➕ Outra (digitar)</option>
              </select>
              {/* Campo livre se escolher "Outra" */}
              {form.operadora === "__outro__" && (
                <input
                  className="search-input"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Digite o nome da operadora"
                  value={form.operadora_custom || ""}
                  onChange={e => set("operadora_custom", e.target.value)}
                />
              )}
            </label>
          )}

          <label>Hora de Início
            <input type="time" className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.hora_inicio} onChange={e => set("hora_inicio", e.target.value)} />
          </label>
          <label>Hora de Término
            <input type="time" className="search-input" style={{ width: "100%", marginTop: 4 }}
              value={form.hora_termino} onChange={e => set("hora_termino", e.target.value)} />
          </label>
        </div>

        <label style={{ marginTop: 10, display: "block" }}>Evento
          <input className="search-input" style={{ width: "100%", marginTop: 4 }}
            value={form.evento} onChange={e => set("evento", e.target.value)} />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-cancel btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            // Resolve operadora final
            const opFinal = form.operadora === "__outro__"
              ? (form.operadora_custom || "").trim()
              : form.operadora;
            onSave({ ...form, operadora: opFinal });
          }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function HistoricoEventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroOp, setFiltroOp] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [linksTransporte, setLinksTransporte] = useState([]);
  const [linksIP, setLinksIP] = useState([]);

  async function carregar() {
    setLoading(true);
    try {
      // Carrega eventos
      const snap = await getDocs(collection(db, COL));
      const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      dados.sort((a, b) => {
        const da = a.data?.split("/").reverse().join("-") || "";
        const db2 = b.data?.split("/").reverse().join("-") || "";
        return db2.localeCompare(da);
      });
      setEventos(dados);

      // Carrega operadoras do relatório de links
      const snapLinks = await getDocs(collection(db, COL_LINKS));
      const links = snapLinks.docs.map(d => d.data());
      const opTransporte = [...new Set(
        links.filter(l => l.tipo === "TRANSPORTE" && l.operadora)
             .map(l => l.operadora)
      )].sort();
      const opIP = [...new Set(
        links.filter(l => l.tipo === "IP" && l.operadora)
             .map(l => l.operadora)
      )].sort();
      setLinksTransporte(opTransporte);
      setLinksIP(opIP);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(form) {
    if (!form.data) return alert("Informe a data.");
    // Remove campo auxiliar antes de salvar
    const { operadora_custom, ...payload } = form;
    if (editando) {
      await updateDoc(doc(db, COL, editando), payload);
      setEventos(ev => ev.map(e => e.id === editando ? { ...e, ...payload } : e));
    } else {
      const ref = await addDoc(collection(db, COL), { ...payload, timestamp: serverTimestamp() });
      setEventos(ev => [{ id: ref.id, ...payload }, ...ev]);
    }
    setModal(false); setEditando(null);
  }

  async function excluir(id) {
    if (!confirm("Excluir este evento?")) return;
    await deleteDoc(doc(db, COL, id));
    setEventos(ev => ev.filter(e => e.id !== id));
  }

  function exportarExcel() {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["DATA","STATUS","TIPO LINK","PROTOCOLO","OPERADORA","HORA INÍCIO","HORA TÉRMINO","EVENTO"],
      ...filtrados.map(e => [e.data,e.status,e.tipo_link||"",e.protocolo,e.operadora,e.hora_inicio,e.hora_termino,e.evento])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Histórico");
    XLSX.writeFile(wb, "historico_eventos.xlsx");
  }

  function exportarPDF() {
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(13);
    pdf.text("Histórico de Eventos", 14, 14);
    autoTable(pdf, {
      startY: 20,
      head: [["DATA","STATUS","TIPO","PROTOCOLO","OPERADORA","INÍCIO","TÉRMINO","EVENTO"]],
      body: filtrados.map(e => [e.data,e.status,e.tipo_link||"",e.protocolo,e.operadora,e.hora_inicio,e.hora_termino,e.evento]),
      styles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const v = (data.cell.raw||"").toUpperCase();
          if (v === "INDISPONÍVEL") data.cell.styles.fillColor = [254, 202, 202];
          else if (v === "DEGRADAÇÃO") data.cell.styles.fillColor = [254, 243, 199];
        }
      }
    });
    pdf.save("historico_eventos.pdf");
  }

  const operadoras = [...new Set(eventos.map(e => e.operadora).filter(Boolean))];
  const filtrados = eventos.filter(e => {
    const matchOp = !filtroOp || e.operadora === filtroOp;
    const matchStatus = filtroStatus === "TODOS" || e.status === filtroStatus;
    const matchTipo = filtroTipo === "TODOS" || e.tipo_link === filtroTipo;
    return matchOp && matchStatus && matchTipo;
  });

  return (
    <div style={{ padding: "16px" }}>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setModal(true); }}>+ Novo Evento</button>
        <select className="search-input" style={{ width: 150 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="TODOS">Todos os status</option>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="search-input" style={{ width: 150 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="TODOS">Todos os tipos</option>
          <option value="TRANSPORTE">Transporte</option>
          <option value="IP">IP</option>
        </select>
        <select className="search-input" style={{ width: 160 }} value={filtroOp} onChange={e => setFiltroOp(e.target.value)}>
          <option value="">Todas operadoras</option>
          {operadoras.map(o => <option key={o}>{o}</option>)}
        </select>
        <button className="btn btn-success btn-sm" onClick={exportarExcel}>📊 Excel</button>
        <button className="btn btn-orange btn-sm" onClick={exportarPDF}>📄 PDF</button>
      </div>

      {loading ? <div className="loading">Carregando...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Data</th><th>Status</th><th>Tipo</th><th>Protocolo</th>
                <th>Operadora</th><th>Início</th><th>Término</th><th>Evento</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={10} className="empty">Nenhum evento registrado.</td></tr>
              )}
              {filtrados.map((e, i) => (
                <tr key={e.id} style={statusStyle(e.status)}>
                  <td style={{ color: "#475569" }}>{i + 1}</td>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{e.data}</td>
                  <td>
                    <span style={{
                      padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem",
                      fontWeight: 700, ...statusStyle(e.status)
                    }}>{e.status}</span>
                  </td>
                  <td>
                    {e.tipo_link && (
                      <span style={{
                        padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
                        background: e.tipo_link === "TRANSPORTE" ? "#dbeafe" : "#ede9fe",
                        color: e.tipo_link === "TRANSPORTE" ? "#1e3a8a" : "#4c1d95",
                      }}>{e.tipo_link}</span>
                    )}
                  </td>
                  <td>{e.protocolo}</td>
                  <td style={{ fontWeight: 600 }}>{e.operadora}</td>
                  <td>{e.hora_inicio}</td>
                  <td>{e.hora_termino}</td>
                  <td>{e.evento}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-edit" onClick={() => { setEditando(e.id); setModal(true); }}>✏️</button>
                      <button className="btn btn-danger" onClick={() => excluir(e.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <EventoModal
          initial={editando ? eventos.find(e => e.id === editando) : null}
          onClose={() => { setModal(false); setEditando(null); }}
          onSave={salvar}
          linksTransporte={linksTransporte}
          linksIP={linksIP}
        />
      )}
    </div>
  );
}
