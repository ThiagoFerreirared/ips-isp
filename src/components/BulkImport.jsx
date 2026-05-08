import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const toKey = c => c.replace(/[\/\s]/g,"_").toUpperCase();

export default function BulkImport({ cidade, onClose, onDone }) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  const linhas = texto.split("\n").map(l => l.trim()).filter(l => l);
  const preview = linhas.map(l => {
    const parts = l.split(/[,;\t]+/);
    return { ip: parts[0]?.trim() || "", login: parts[1]?.trim() || "VAGO", data: parts[2]?.trim() || "" };
  }).filter(r => r.ip);

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
            {preview.length > 20 && <div style={{color:"#64748b",fontSize:".75rem",marginTop:"6px"}}>...e mais {preview.length-20} registros</div>}
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