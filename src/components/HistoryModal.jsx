import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export default function HistoryModal({ ip, cidade, onClose }) {
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q2 = query(
          collection(db, "historico"),
          where("ip", "==", ip),
          where("cidade", "==", cidade),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q2);
        setHist(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [ip, cidade]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>📋 Histórico — {ip}</h2>

        {loading && <div className="loading">Carregando...</div>}
        {!loading && hist.length === 0 && <div className="empty">Nenhuma alteração registrada.</div>}

        {hist.map(h => (
          <div key={h.id} className="hist-item">
            <div className="hist-time">{h.timestamp?.toDate?.()?.toLocaleString("pt-BR") || h.timestamp}</div>
            <div className="hist-action">{h.acao} por <b>{h.usuario || "sistema"}</b></div>
            {h.diff && (
              <div className="hist-diff">
                {Object.entries(h.diff).map(([campo, {de,para}]) => (
                  <div key={campo}>
                    <b>{campo}:</b> <span className="hist-old">{de}</span> → <span className="hist-new">{para}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}