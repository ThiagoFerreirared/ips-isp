import { useCities } from "../../context/CitiesContext";
import React, { useState, useRef } from "react";
import { importIPs } from "../../lib/ipStore";
import { previewImport, mapSheetRows } from "../../lib/ipImport";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet } from "lucide-react";
import { Modal, Button, Textarea } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function BulkImportModal({ cidade, existing, onClose, onDone }) {
  const { cidadeLabel } = useCities();
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const checked = previewImport(linhas.map((l) => l.split(/[,;\t]/)), cidade, existing);
  const preview = checked.filter((r) => !r.error).map((r) => r.record);
  const invalid = checked.some((r) => r.error === "IP inválido");
  const [progress, setProgress] = useState(0);

  function handleXLSX(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
        setTexto(mapSheetRows(rows).map((r) => r.join("\t")).join("\n"));
      } catch (error) { toast.error(error.message); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function importar() {
    if (loading || invalid || !preview.length) return;
    setLoading(true);
    try {
      const result = await importIPs(cidade, preview, setProgress);
      toast.success(result.added + " IPs importados; " + result.skipped + " existentes ignorados.");
      onDone();
      onClose();
    } catch (e) {
      toast.error("Erro ao importar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      size="lg"
      title={`Importar lista — ${cidadeLabel(cidade)}`}
      icon={Download}
      onClose={() => { if (!loading) onClose(); }}
      footer={
        <>
          <Button variant="ghost" size="sm" disabled={loading} onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={importar} disabled={loading || invalid || !preview.length}>
            {loading ? "Importando… " + progress + " salvos" : `Importar ${preview.length} IPs`}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Cole uma lista de IPs, um por linha. Formatos aceitos:{" "}
        <code className="ip-mono text-primary">IP</code> ·{" "}
        <code className="ip-mono text-primary">IP, Login</code> ·{" "}
        <code className="ip-mono text-primary">IP, Login, Data</code>
      </p>

      <div className="mb-3">
        <input ref={fileRef} disabled={loading} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXLSX} />
        <Button variant="soft" size="sm" disabled={loading} onClick={() => fileRef.current.click()}>
          <FileSpreadsheet className="h-4 w-4" /> Importar do Excel (.xlsx)
        </Button>
        <p className="mt-1.5 text-xs text-muted">Colunas na 1ª linha: IP, Login, Data.</p>
      </div>

      <Textarea
        disabled={loading}
        rows={8}
        className="font-mono text-xs"
        placeholder={"177.130.48.10\n177.130.48.11, Cliente João\n177.130.48.12, VAGO, 07/05/2025"}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      {checked.length > 0 && <div className="mt-3 text-sm text-muted">{preview.length} novos · {checked.filter((r) => r.error).length} com avisos. Duplicados serão ignorados; corrija os IPs inválidos antes de importar.</div>}
      {checked.filter((r) => r.error || r.corrected).map((r) => <div key={r.line} className="mt-1 text-xs text-amber-500">Linha {r.line}: {r.record.ip} — {r.error || "IP e login invertidos: corrigidos na prévia"}</div>)}
      {preview.length > 0 && (
        <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-border bg-surface-2 p-3 text-xs">
          {preview.slice(0, 30).map((r, i) => (
            <div key={i} className="flex gap-2 border-b border-border/60 py-1 last:border-0">
              <span className="ip-mono">{r.ip}</span>
              <span className="text-muted">— {r.login}{r.data && ` — ${r.data}`}</span>
            </div>
          ))}
          {preview.length > 30 && (
            <div className="pt-2 text-muted">…e mais {preview.length - 30} registros</div>
          )}
        </div>
      )}
    </Modal>
  );
}
