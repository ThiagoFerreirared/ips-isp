import React, { useState } from "react";

const EXTRA_COLS = {
  ITAITUBA: ["subrede","fabricante"],
  RUROPOLIS: ["ip_privado","fabricante","largura_banda"],
  ALTAMIRA_ALENQUER: ["ip_privado","cidade_local"],
  SAPEZALCJ: ["vlan"],
  VILHENA: ["vlan"],
  COMODORO: ["vlan"],
  MANAUS: ["rede","descricao"],
};

function hoje() {
  return new Date().toLocaleDateString("pt-BR");
}

export default function AddEditModal({ cidade, editando, initial, onClose, onSave }) {
  const cidadeKey = cidade.replace(/[\/\s]/g,"_").toUpperCase();
  const extras = EXTRA_COLS[cidadeKey] || [];
  const [form, setForm] = useState(initial || { ip:"", login:"VAGO", data: hoje(), obs:"" });

  function set(k, v) { setForm(f => ({...f, [k]: v})); }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>{editando ? "✏️ Editar Registro" : "➕ Novo IP"}</h2>

        <div className="form-group">
          <label>Endereço IP</label>
          <input placeholder="ex: 177.130.48.10" value={form.ip} onChange={e=>set("ip",e.target.value)} />
        </div>

        <div className="form-group">
          <label>Login / Uso</label>
          <input placeholder="ex: Cliente João ou VAGO" value={form.login} onChange={e=>set("login",e.target.value)} />
        </div>

        <div className="form-group">
          <label>Data de Verificação</label>
          <input placeholder="ex: 20/06/2024" value={form.data} onChange={e=>set("data",e.target.value)} />
        </div>

        {extras.map(col => (
          <div className="form-group" key={col}>
            <label>{col.replace(/_/g," ").toUpperCase()}</label>
            <input value={form[col]||""} onChange={e=>set(col,e.target.value)} />
          </div>
        ))}

        <div className="form-group">
          <label>Observações</label>
          <textarea placeholder="Anotações livres..." value={form.obs||""} onChange={e=>set("obs",e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            {editando ? "Salvar Alterações" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}