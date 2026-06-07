import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { History } from "lucide-react";
import { db } from "../../firebase/config";
import { Modal, Button, Loading, EmptyState } from "../ui";

const ts = (t) => (t?.toDate ? t.toDate().getTime() : 0);

export default function HistoryModal({ ip, cidade, onClose }) {
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Filtro só por ip (equality simples → sem índice composto); cidade + ordenação no cliente.
        const snap = await getDocs(query(collection(db, "historico"), where("ip", "==", ip)));
        const dados = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((h) => h.cidade === cidade)
          .sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
        setHist(dados);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [ip, cidade]);

  return (
    <Modal
      title={`Histórico — ${ip}`}
      icon={History}
      onClose={onClose}
      footer={<Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>}
    >
      {loading ? (
        <Loading />
      ) : hist.length === 0 ? (
        <EmptyState icon={History} title="Sem alterações" desc="Nenhuma mudança registrada para este IP." />
      ) : (
        <div className="space-y-3">
          {hist.map((h) => (
            <div key={h.id} className="rounded-xl border border-border bg-surface-2 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text">{h.acao}</span>
                <span className="text-xs text-muted">
                  {h.timestamp?.toDate?.().toLocaleString("pt-BR") || "—"}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">por {h.usuario || "sistema"}</div>
              {h.diff && Object.keys(h.diff).length > 0 && (
                <div className="mt-2.5 space-y-1 border-t border-border pt-2.5 text-xs">
                  {Object.entries(h.diff).map(([campo, { de, para }]) => (
                    <div key={campo} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-text-soft">{campo}:</span>
                      <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400 line-through">{de || "—"}</span>
                      <span className="text-muted">→</span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">{para || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
