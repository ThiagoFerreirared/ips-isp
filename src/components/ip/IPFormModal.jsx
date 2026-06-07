import React, { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Modal, Button, Input, Textarea, Field } from "../ui";
import { extrasFor } from "../../lib/cities";
import { isValidIP } from "../../lib/ip";
import { useToast } from "../../context/ToastContext";

const hoje = () => new Date().toLocaleDateString("pt-BR");

export default function IPFormModal({ cidade, initial, onClose, onSave }) {
  const toast = useToast();
  const editando = !!initial;
  const extras = extrasFor(cidade);
  const [form, setForm] = useState(initial || { ip: "", login: "VAGO", data: hoje(), obs: "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.ip?.trim()) return toast.error("Informe o endereço IP.");
    if (!isValidIP(form.ip)) return toast.error("IP inválido. Use o formato 0.0.0.0");
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editando ? "Editar registro" : "Novo IP"}
      icon={editando ? Pencil : Plus}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {editando ? "Salvar alterações" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Endereço IP">
          <Input
            autoFocus={!editando}
            placeholder="ex: 177.130.48.10"
            value={form.ip}
            onChange={(e) => set("ip", e.target.value)}
            className="ip-mono"
          />
        </Field>
        <Field label="Login / Uso" hint="Deixe 'VAGO' se o IP estiver livre.">
          <Input
            placeholder="ex: Cliente João, CGNAT, OLT-CENTRO…"
            value={form.login}
            onChange={(e) => set("login", e.target.value)}
          />
        </Field>
        <Field label="Data de verificação">
          <Input placeholder="dd/mm/aaaa" value={form.data || ""} onChange={(e) => set("data", e.target.value)} />
        </Field>

        {extras.map((col) => (
          <Field key={col} label={col.replace(/_/g, " ").toUpperCase()}>
            <Input value={form[col] || ""} onChange={(e) => set(col, e.target.value)} />
          </Field>
        ))}

        <Field label="Observações">
          <Textarea placeholder="Anotações livres…" value={form.obs || ""} onChange={(e) => set("obs", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
