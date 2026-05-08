import React, { useState, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import * as XLSX from "xlsx";

const toKey = c => c.replace(/[\/\s]/g,"_").toUpperCase();

export default function BulkImport({ cidade, onClose, onDone }) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const linhas = texto.split("\n").map(l => l.trim()).filter(l => l);
  const preview = linhas.map(l => {
    const parts = l.split(/[,;\t]+/);
    return { ip: parts[0]?.trim() || "", login: parts[1]?.trim() || "VAGO", data: parts[2]?.trim() || "" };
  }).filter(r => r.ip);

  function handleXLSX(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const workbook = XLSX.read(evt.target.result, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const linhasGeradas = rows
        .slice(1)
        .filter(r => r[0])
        .map(r => [r[0], r[1] || "VAGO", r[2] || ""].join("\t"));
      setTexto(linhasGeradas.join("\n"));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function importar() {
    if (!preview.length) return;
    setLoading(true);
    const colRef = collection(db, "ips_" + toKey(cidade));
    for (const reg of preview) {
      await addDoc(colRef, reg);
    }
    setLoading(false);
    onDone();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e=>e.stopPropagation()}>
        <h2>📥 Importação Rápida — {cidade}</h2>
        <p style={{fontSize:".8rem",color:"#64748b",marginBottom:"12px"}}>
          Cole uma lista de IPs, um por linha. Formato aceito:
          <br />
          <code style={{color:"#7dd3fc"}}>IP</code> ou <code style={{color:"#7dd3fc"}}>IP, Login</code> ou <code style={{color:"#7dd3fc"}}>IP, Login, Data</code>
        </p>

        <div style={{marginBottom:"12px"}}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{display:"none"}}
            onChange={handleXLSX}
          />
          <button
            className="btn btn-cancel"
            style={{display:"flex",alignItems:"center",gap:"6px",fontSize:".85rem"}}
            onClick={() => fileRef.current.click()}
          >
            📂 Importar do Excel (.xlsx)
          </button>
          <span style={{fontSize:".75rem",color:"#64748b",marginTop:"4px",display:"block"}}>
            A planilha deve ter as colunas: IP, Login, Data na primeira linha
          </span>
        </div>

        <div className="form-group">
          <textarea
            className="bulk-textarea"
            rows={8}
            placeholder={"177.130.48.10\n177.130.48.11, Cliente João\n177.130.48.12, VAGO, 07/05/2025"}
            value={texto}
            onChange={e=>setTexto(e.target.value)}
          />
        </div>

        {preview.length > 0 && (
          <div className="bulk-preview">
            {preview.slice(0,20).map((r,i) => (
              <div key={i} className="bulk-preview-item">
                <span>{r.ip}</span> — {r.login} {r.data && `— ${r.data}`}
              </div>
            ))}
            {preview.length > 20 && (
              <div style={{color:"#64748b",fontSize:".75rem",marginTop:"6px"}}>
                ...e mais {preview.length-20} registros
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={importar} disabled={loading || !preview.length}>
            {loading ? "Importando..." : `Importar ${preview.length} IPs`}
          </button>
        </div>
      </div>
    </div>
  );
}
