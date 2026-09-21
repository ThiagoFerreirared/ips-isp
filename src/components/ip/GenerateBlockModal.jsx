import { useCities } from "../../context/CitiesContext";
import React, { useState } from "react";
import { importIPs } from "../../lib/ipStore";
import { Zap } from "lucide-react";
import { generateIPs, isValidIP } from "../../lib/ip";
import { Modal, Button, Field, Input } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function GenerateBlockModal({ cidade, onClose, onDone }) {
  const { cidadeLabel } = useCities();
  const toast = useToast();
  const [base, setBase] = useState("");
  const [ranges, setRanges] = useState("0-255");
  const [loading, setLoading] = useState(false);

  const preview = (() => {
    try {
      const parts = ranges.split(",").map((r) => r.trim());
      if (!isValidIP(base.trim() + ".0") || parts.some((r) => !/^\d{1,3}(-\d{1,3})?$/.test(r) || r.split("-").some((n) => +n > 255) || (r.includes("-") && +r.split("-")[0] > +r.split("-")[1]))) return [];
      return [...new Set(generateIPs(base.trim(), parts))];
    } catch {
      return [];
    }
  })();

  async function gerar() {
    if (loading || !preview.length) return;
    setLoading(true);
    try {
      const result = await importIPs(cidade, preview.map((ip) => ({ ip, login: "VAGO", data: "" })));
      toast.success(result.added + " IPs gerados; " + result.skipped + " existentes ignorados.");
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
      title={`Gerar bloco — ${cidadeLabel(cidade)}`}
      icon={Zap}
      onClose={() => { if (!loading) onClose(); }}
      footer={
        <>
          <Button variant="ghost" size="sm" disabled={loading} onClick={onClose}>Cancelar</Button>
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
