import React, { useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { generateIPs } from "../utils/generateBlock";

const toKey = c => c.replace(/[\/\s]/g,"_").toUpperCase();

export default function GenerateBlock({ cidade, onClose, onDone }) {
  const [base, setBase] = useState("");
  const [ranges, setRanges] = useState("0-255");
  const [loading, setLoading] = useState(false);

  const preview = (() => {
    try { return generateIPs(base, [ranges]); } catch { return []; }
  })();

  async function gerar() {
    if (!preview.length) return;
    setLoading(true);
    const colRef = collection(db, "ips_" + toKey(cidade));
    const snap = await getDocs(colRef);
    const existentes = new Set(snap.docs.map(d => d.data().ip));
    let count = 0;

    for (const ip of preview) {
      if (!existentes.has(ip)) {
        await addDoc(colRef, { ip, login: "VAGO", data: "" });
        count++;
      }
    }

    setLoading(false);
    alert(`${count} IPs gerados! (${preview.length - count} já existiam)`);
    onDone();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>⚡ Gerar Bloco de IPs — {cidade}</h2>
        <p style={{fontSize:".8rem",color:"#64748b",marginBottom:"14px"}}>
          Gera automaticamente todos os IPs de um bloco /24 ou intervalo personalizado.
        </p>

        <div className="form-group">
          <label>Base do bloco (3 octetos)</label>
          <input placeholder="ex: 177.130.48" value={base} onChange={e=>setBase(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Intervalo do 4º octeto</label>
          <input placeholder="ex: 0-255  ou  0-127  ou  0,5,10" value={ranges} onChange={e=>setRanges(e.target.value)} />
        </div>

        {preview.length > 0 && (
          <div className="gen-preview">
            {preview.slice(0,12).map((ip,i) => <div key={i}>{ip}</div>)}
            {preview.length > 12 && <div style={{color:"#38bdf8"}}>...e mais {preview.length-12} IPs ({preview.length} total)</div>}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn btn-success" onClick={gerar} disabled={loading || preview.length===0}>
            {loading ? "Gerando..." : `Gerar ${preview.length} IPs`}
          </button>
        </div>
      </div>
    </div>
  );
}