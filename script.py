base = "ips-isp"

iptable_jsx = """import React, { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";

const toKey = (cidade) => cidade.replace(/[\\/\\s]/g, "_").toUpperCase();

export default function IPTable({ cidade }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ip: "", login: "", data: hoje() });
  const [filtro, setFiltro] = useState("TODOS");

  const colRef = collection(db, "ips_" + toKey(cidade));

  function hoje() {
    const d = new Date();
    return d.toLocaleDateString("pt-BR");
  }

  async function carregar() {
    setLoading(true);
    try {
      const snap = await getDocs(colRef);
      const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      dados.sort((a, b) => sortIP(a.ip) - sortIP(b.ip));
      setRegistros(dados);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function sortIP(ip) {
    if (!ip) return 0;
    const parts = ip.split(".").map(Number);
    return parts[0]*16777216 + parts[1]*65536 + parts[2]*256 + (parts[3]||0);
  }

  useEffect(() => { carregar(); setBusca(""); setFiltro("TODOS"); }, [cidade]);

  async function salvar() {
    if (!form.ip.trim()) return alert("Informe o IP.");
    try {
      if (editando) {
        await updateDoc(doc(db, "ips_" + toKey(cidade), editando), form);
      } else {
        await addDoc(colRef, form);
      }
      fecharModal();
      carregar();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
  }

  async function excluir(id) {
    if (!confirm("Excluir este registro?")) return;
    await deleteDoc(doc(db, "ips_" + toKey(cidade), id));
    carregar();
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ ip: "", login: "VAGO", data: hoje() });
    setModal(true);
  }

  function abrirEditar(r) {
    setEditando(r.id);
    setForm({ ip: r.ip, login: r.login, data: r.data });
    setModal(true);
  }

  function fecharModal() { setModal(false); setEditando(null); }

  const filtrados = registros.filter(r => {
    const txt = busca.toLowerCase();
    const match = !txt || r.ip?.includes(txt) || r.login?.toLowerCase().includes(txt);
    const fmatch = filtro === "TODOS" || r.login?.toUpperCase() === filtro ||
      (filtro === "USADO" && r.login?.toUpperCase() !== "VAGO");
    return match && fmatch;
  });

  const vagos = registros.filter(r => r.login?.toUpperCase() === "VAGO").length;
  const usados = registros.length - vagos;

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-card"><div className="num">{registros.length}</div><div className="lbl">Total IPs</div></div>
        <div className="stat-card"><div className="num" style={{color:"#4ade80"}}>{usados}</div><div className="lbl">Usados</div></div>
        <div className="stat-card"><div className="num" style={{color:"#f59e0b"}}>{vagos}</div><div className="lbl">Vagos</div></div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="🔍  Buscar IP ou login..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <select
          className="search-input"
          style={{width:"140px"}}
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        >
          <option value="TODOS">Todos</option>
          <option value="VAGO">Vagos</option>
          <option value="USADO">Usados</option>
        </select>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo IP</button>
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>IP</th>
                <th>Login / Uso</th>
                <th>Data Verificação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:"center",padding:"32px",color:"#64748b"}}>Nenhum registro encontrado.</td></tr>
              )}
              {filtrados.map((r, i) => (
                <tr key={r.id}>
                  <td style={{color:"#475569"}}>{i+1}</td>
                  <td style={{fontFamily:"monospace", color:"#7dd3fc"}}>{r.ip}</td>
                  <td>
                    <span className={r.login?.toUpperCase() === "VAGO" ? "badge-vago" : "badge-used"}>
                      {r.login}
                    </span>
                  </td>
                  <td style={{color:"#94a3b8"}}>{r.data}</td>
                  <td style={{display:"flex", gap:"6px"}}>
                    <button className="btn btn-edit" onClick={() => abrirEditar(r)}>✏️</button>
                    <button className="btn btn-danger" onClick={() => excluir(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? "Editar Registro" : "Novo IP"}</h2>
            <div className="form-group">
              <label>Endereço IP</label>
              <input
                placeholder="ex: 177.130.48.10"
                value={form.ip}
                onChange={e => setForm({...form, ip: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Login / Uso</label>
              <input
                placeholder="ex: Cliente João Silva ou VAGO"
                value={form.login}
                onChange={e => setForm({...form, login: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Data de Verificação</label>
              <input
                placeholder="ex: 20/06/2024"
                value={form.data}
                onChange={e => setForm({...form, data: e.target.value})}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>
                {editando ? "Salvar Alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open(f"{base}/src/pages/IPTable.jsx", "w") as f:
    f.write(iptable_jsx)

# .gitignore
gitignore = """node_modules
dist
.env
.DS_Store
"""
with open(f"{base}/.gitignore", "w") as f:
    f.write(gitignore)

# README
readme = """# IPs ISP

Sistema web para gerenciamento de IPs por cidade.

## Stack
- React + Vite
- Firebase Firestore
- Deploy: Vercel

## Setup

```bash
cd ips-isp
npm install
npm run dev
```

## Deploy no Vercel

1. Push para GitHub
2. Importe o repositório no Vercel
3. Root directory: `ips-isp`
4. Build command: `npm run build`
5. Output directory: `dist`

## Firebase Firestore Rules (console.firebase.google.com)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
> Atenção: em produção adicione autenticação!

## Coleções no Firestore

Uma coleção por cidade:
- `ips_SANTAREM`
- `ips_MANAUS`
- `ips_ITAITUBA`
- `ips_RUROPOLIS`
- `ips_ALTAMIRA_ALENQUER`
- `ips_ALENQUER`
- `ips_SAPEZAL_CJ`
- `ips_VILHENA`
- `ips_COMODORO`
- `ips_PRIVADO_BACKBONE`
- `ips_IPV6_WSP`

Cada documento tem: `ip`, `login`, `data`
"""
with open(f"{base}/README.md", "w") as f:
    f.write(readme)

print("Todos os arquivos criados!")

# Lista todos os arquivos
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d != "node_modules"]
    level = root.replace(base, "").count(os.sep)
    indent = " " * 2 * level
    print(f"{indent}{os.path.basename(root)}/")
    subindent = " " * 2 * (level + 1)
    for file in files:
        print(f"{subindent}{file}")
