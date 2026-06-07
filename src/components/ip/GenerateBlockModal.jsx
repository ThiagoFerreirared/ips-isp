import React, { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { Zap } from "lucide-react";
import { db } from "../../firebase/config";
import { colName, generateIPs } from "../../lib/ip";
import { Modal, Button, Field, Input } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function GenerateBlockModal({ cidade, onClose, onDone }) {
  const toast = useToast();
  const [base, setBase] = useState("");
  const [ranges, setRanges] = useState("0-255");
  const [loading, setLoading] = useState(false);

  const preview = (() => {
    try {
      return base.trim() ? generateIPs(base.trim(), [ranges]) : [];
    } catch {
      return [];
    }
  })();

  async function gerar() {
    if (!preview.length) return;
    setLoading(true);
    try {
      const col = collection(db, colName(cidade));
      const snap = await getDocs(col);
      const existentes = new Set(snap.docs.map((d) => d.data().ip));
      const novos = preview.filter((ip) => !existentes.has(ip));

      for (let i = 0; i < novos.length; i += 450) {
        const batch = writeBatch(db);
        novos.slice(i, i + 450).forEach((ip) => batch.set(doc(col), { ip, login: "VAGO", data: "" }));
        await batch.commit();
      }

      toast.success(`${novos.length} IPs gerados${preview.length - novos.length ? ` (${preview.length - novos.length} já existiam)` : ""}.`);
      onDone();
      onClose();
    } catch (e) {
      toast.error("Erro ao gerar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={`Gerar bloco — ${cidade.replace(/_/g, " ")}`}
      icon={Zap}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="success" size="sm" onClick={gerar} disabled={loading || !preview.length}>
            {loading ? "Gerando…" : `Gerar ${preview.length} IPs`}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Cria automaticamente os IPs de um bloco /24 ou intervalo. IPs já existentes são ignorados.
      </p>

      <div className="space-y-4">
        <Field label="Base do bloco (3 octetos)">
          <Input className="ip-mono" placeholder="ex: 177.130.48" value={base} onChange={(e) => setBase(e.target.value)} />
        </Field>
        <Field label="Intervalo do 4º octeto" hint="ex: 0-255 · 0-127 · 1,5,10">
          <Input className="ip-mono" value={ranges} onChange={(e) => setRanges(e.target.value)} />
        </Field>
      </div>

      {preview.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-border bg-surface-2 p-3 font-mono text-xs text-muted">
          {preview.slice(0, 14).map((ip, i) => (
            <div key={i}>{ip}</div>
          ))}
          {preview.length > 14 && (
            <div className="pt-1 text-primary">…e mais {preview.length - 14} IPs ({preview.length} no total)</div>
          )}
        </div>
      )}
    </Modal>
  );
}
