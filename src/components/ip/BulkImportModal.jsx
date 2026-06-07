import React, { useState, useRef } from "react";
import { collection, writeBatch, doc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet } from "lucide-react";
import { db } from "../../firebase/config";
import { colName } from "../../lib/ip";
import { Modal, Button, Textarea } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function BulkImportModal({ cidade, onClose, onDone }) {
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const preview = linhas
    .map((l) => {
      const parts = l.split(/[,;\t]+/);
      return { ip: parts[0]?.trim() || "", login: parts[1]?.trim() || "VAGO", data: parts[2]?.trim() || "" };
    })
    .filter((r) => r.ip);

  function handleXLSX(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const gerado = rows
        .slice(1)
        .filter((r) => r[0])
        .map((r) => [r[0], r[1] || "VAGO", r[2] || ""].join("\t"));
      setTexto(gerado.join("\n"));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function importar() {
    if (!preview.length) return;
    setLoading(true);
    try {
      const col = collection(db, colName(cidade));
      for (let i = 0; i < preview.length; i += 450) {
        const batch = writeBatch(db);
        preview.slice(i, i + 450).forEach((reg) => batch.set(doc(col), reg));
        await batch.commit();
      }
      toast.success(`${preview.length} IPs importados.`);
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
      title={`Importar lista — ${cidade.replace(/_/g, " ")}`}
      icon={Download}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={importar} disabled={loading || !preview.length}>
            {loading ? "Importando…" : `Importar ${preview.length} IPs`}
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
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXLSX} />
        <Button variant="soft" size="sm" onClick={() => fileRef.current.click()}>
          <FileSpreadsheet className="h-4 w-4" /> Importar do Excel (.xlsx)
        </Button>
        <p className="mt-1.5 text-xs text-muted">Colunas na 1ª linha: IP, Login, Data.</p>
      </div>

      <Textarea
        rows={8}
        className="font-mono text-xs"
        placeholder={"177.130.48.10\n177.130.48.11, Cliente João\n177.130.48.12, VAGO, 07/05/2025"}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

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
