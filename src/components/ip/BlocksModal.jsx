import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toKey } from "../../lib/ip";
import { parseCIDR } from "../../lib/subnets";
import { Modal, Textarea, Button } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function BlocksModal({ cidade, blocks, onClose }) {
  const [text, setText] = useState((blocks || []).join("\n"));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  async function save() {
    if (saving) return;
    const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const parsed = lines.map(parseCIDR);
    if (parsed.some((b) => !b)) return toast.error("Use blocos IPv4 de /24 a /32, por exemplo 138.99.109.16/28.");
    const blocks = [...new Set(parsed.map((b) => b.cidr))];
    if (blocks.length > 100) return toast.error("Cadastre até 100 blocos por cidade.");
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "blocos_" + toKey(cidade)), { blocks });
      toast.success("Blocos atualizados.");
      onClose();
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }
  return <Modal title="Blocos da cidade" onClose={() => { if (!saving) onClose(); }} footer={<>
    <Button variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
    <Button disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar blocos"}</Button>
  </>}>
    <p className="mb-3 text-sm text-muted">Um bloco por linha, com máscara de /24 a /32. Os endereços de rede e broadcast também serão listados. Registros existentes são preservados, mesmo fora dos blocos. Deixe vazio para detectar blocos /24 automaticamente.</p>
    <Textarea aria-label="Blocos CIDR" rows={8} disabled={saving} value={text} onChange={(e) => setText(e.target.value)} placeholder={"138.99.109.0/24\n10.0.0.16/30"} />
  </Modal>;
}
