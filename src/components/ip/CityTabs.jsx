import React, { useState, useEffect, useRef } from "react";
import { Plus, X, MapPin, Pencil } from "lucide-react";
import { useCities } from "../../context/CitiesContext";
import { useToast } from "../../context/ToastContext";
import { Modal, Button, Input, Field } from "../ui";
import { cn } from "../../lib/cn";

function CityNameModal({ cityKey, onClose }) {
  const { addCidade, renameCidade, cidadeLabel } = useCities();
  const toast = useToast();
  const [nome, setNome] = useState(cityKey ? cidadeLabel(cityKey) : "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving || !nome.trim()) return;
    setSaving(true);
    try {
      const key = cityKey || await addCidade(nome);
      if (cityKey) await renameCidade(cityKey, nome);
      toast.success(cityKey ? "Nome da cidade atualizado." : "Cidade criada.");
      onClose(key);
    } catch (e) {
      toast.error(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      size="sm"
      title={cityKey ? "Editar nome da cidade" : "Nova cidade / aba"}
      icon={MapPin}
      onClose={() => { if (!saving) onClose(); }}
      footer={
        <>
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => onClose()}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={saving || !nome.trim()}>{saving ? "Salvando…" : cityKey ? "Salvar" : "Criar"}</Button>
        </>
      }
    >
      <Field label="Nome da aba" hint={cityKey ? undefined : "Espaços viram _ e tudo fica em maiúsculas."}>
        <Input
          disabled={saving}
          autoFocus
          placeholder="ex: NOVO_SITE"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </Field>
    </Modal>
  );
}

export default function CityTabs({ cidade, onSelect }) {
  const { cidades, cidadeLabel, removeCidade, saveOrder } = useCities();
  const toast = useToast();
  const [order, setOrder] = useState(cidades);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const dragFrom = useRef(null);

  useEffect(() => setOrder(cidades), [cidades]);

  function onDragOver(e, i) {
    e.preventDefault();
    if (dragFrom.current === null || dragFrom.current === i) return;
    setOrder((o) => {
      const n = [...o];
      const [m] = n.splice(dragFrom.current, 1);
      n.splice(i, 0, m);
      return n;
    });
    dragFrom.current = i;
  }

  function onDrop() {
    if (JSON.stringify(order) !== JSON.stringify(cidades)) saveOrder(order);
    dragFrom.current = null;
  }

  async function del(key) {
    const ok = await toast.confirm({
      title: "Deletar cidade",
      message: `Remover a aba "${cidadeLabel(key)}" e TODOS os IPs dela do Firebase?\n\nEsta ação não pode ser desfeita.`,
      confirmLabel: "Deletar",
      danger: true,
    });
    if (!ok) return;
    try {
      await removeCidade(key);
      toast.success(`"${cidadeLabel(key)}" removida.`);
      if (cidade === key) {
        const restante = cidades.find((c) => c !== key);
        if (restante) onSelect(restante);
      }
    } catch (e) {
      toast.error("Erro ao deletar: " + e.message);
    }
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {order.map((c, i) => {
        const active = cidade === c;
        return (
          <div
            key={c}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={onDrop}
            className={cn(
              "group relative flex shrink-0 items-center rounded-xl border transition",
              active
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-surface text-text-soft hover:border-border-strong hover:text-text"
            )}
          >
            <button
              onClick={() => onSelect(c)}
              className="cursor-grab py-2 pl-3.5 pr-2 text-sm font-medium active:cursor-grabbing"
            >
              {cidadeLabel(c)}
            </button>
            <button
              type="button"
              onClick={() => setEditing(c)}
              title="Editar nome"
              aria-label={`Editar nome de ${cidadeLabel(c)}`}
              className="mr-1 grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-primary/15 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); del(c); }}
              title="Deletar"
              className="mr-1.5 grid h-5 w-5 place-items-center rounded text-muted opacity-0 transition hover:bg-red-500/15 hover:text-red-500 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <button
        onClick={() => setAdding(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted transition hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Nova
      </button>

      {editing && <CityNameModal cityKey={editing} onClose={() => setEditing(null)} />}
      {adding && (
        <CityNameModal
          onClose={(key) => {
            setAdding(false);
            if (key) onSelect(key);
          }}
        />
      )}
    </div>
  );
}
