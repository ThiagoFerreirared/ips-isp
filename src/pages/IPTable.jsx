import React, { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { classifyLogin, badgeClass, rowClass } from "../utils/classify";
import { exportToExcel } from "../utils/exportExcel";
import AddEditModal  from "../components/AddEditModal";
import BulkImport    from "../components/BulkImport";
import GenerateBlock from "../components/GenerateBlock";
import HistoryModal  from "../components/HistoryModal";

const toKey = c => c.replace(/[\/\s]/g,"_").toUpperCase();
const PAGE_SIZE = 100;

const EXTRA_COLS = {
  ITAITUBA: ["subrede","fabricante"],
  RUROPOLIS: ["ip_privado","fabricante","largura_banda"],
  ALTAMIRA_ALENQUER: ["ip_privado","cidade_local"],
  SAPEZALCJ: ["vlan"],
  VILHENA: ["vlan"],
  COMODORO: ["vlan"],
  MANAUS: ["rede","descricao"],
};

function sortIP(ip="") {
  const p = ip.split(".").map(Number);
  return p[0]*16777216+p[1]*65536+p[2]*256+(p[3]||0);
}

export default function IPTable({ cidade }) {
  const { user } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");
  const [filtro, setFiltro]       = useState("TODOS");
  const [pagina, setPagina]       = useState(1);
  const [modal, setModal]         = useState(null);
  const [selecionado, setSelecionado] = useState(null);

  const colKey  = "ips_" + toKey(cidade);
  const colRef  = collection(db, colKey);
  const extras  = EXTRA_COLS[toKey(cidade)] || [];

  async function carregar() {
    setLoading(true);
    try {
      const snap = await getDocs(colRef);
      const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      dados.sort((a,b) => sortIP(a.ip) - sortIP(b.ip));
      setRegistros(dados);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { carregar(); setBusca(""); setFiltro("TODOS"); setPagina(1); }, [cidade]);

  async function salvar(form) {
    if (!form.ip?.trim()) return alert("Informe o IP.");
    try {
      if (selecionado) {
        const before = registros.find(r => r.id === selecionado);
        const diff = {};
        ["ip","login","data","obs",...extras].forEach(k => {
          if ((before[k]||"") !== (form[k]||"")) diff[k] = { de: before[k]||"", para: form[k]||"" };
        });
        await updateDoc(doc(db, colKey, selecionado), form);
        if (Object.keys(diff).length) {
          await addDoc(collection(db,"historico"), {
            ip: form.ip, cidade: toKey(cidade),
            acao: "Edição", diff,
            usuario: user?.email || "desconhecido",
            timestamp: serverTimestamp()
          });
        }
      } else {
        await addDoc(colRef, form);
        await addDoc(collection(db,"historico"), {
          ip: form.ip, cidade: toKey(cidade),
          acao: "Criação", diff: {},
          usuario: user?.email || "desconhecido",
          timestamp: serverTimestamp()
        });
      }
      setModal(null); setSelecionado(null); carregar();
    } catch(e) { alert("Erro: " + e.message); }
  }

  async function excluir(id, ip) {
    if (!confirm(`Excluir ${ip}?`)) return;
    await deleteDoc(doc(db, colKey, id));
    await addDoc(collection(db,"historico"), {
      ip, cidade: toKey(cidade), acao: "Exclusão", diff: {},
      usuario: user?.email || "desconhecido", timestamp: serverTimestamp()
    });
    carregar();
  }

  function abrirEditar(r) { setSelecionado(r.id); setModal("edit"); }
  function abrirHist(r)   { setSelecionado(r); setModal("hist"); }
  function fechar()       { setModal(null); setSelecionado(null); }

  const filtrados = registros.filter(r => {
    const txt = busca.toLowerCase();
    const matchBusca = !txt || r.ip?.includes(txt) || r.login?.toLowerCase().includes(txt)
      || r.obs?.toLowerCase().includes(txt);
    const tipo = classifyLogin(r.login);
    const matchFiltro = filtro === "TODOS" || tipo === filtro.toLowerCase()
      || (filtro === "USADO" && tipo !== "vago");
    return matchBusca && matchFiltro;
  });

  const totalPags = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pagAtual  = Math.min(pagina, totalPags);
  const slice     = filtrados.slice((pagAtual-1)*PAGE_SIZE, pagAtual*PAGE_SIZE);

  const vagos   = registros.filter(r => classifyLogin(r.login)==="vago").length;
  const usados  = registros.length - vagos;

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-card"><div className="num">{registros.length}</div><div className="lbl">Total</div></div>
        <div className="stat-card"><div className="num" style={{color:"#4ade80"}}>{usados}</div><div className="lbl">Usados</div></div>
        <div className="stat-card"><div className="num" style={{color:"#f59e0b"}}>{vagos}</div><div className="lbl">Vagos</div></div>
      </div>

      <div className="toolbar">
        <input className="search-input" style={{width:"220px"}} placeholder="🔍 Buscar IP, login..." value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1);}} />
        <select className="search-input" style={{width:"130px"}} value={filtro} onChange={e=>{setFiltro(e.target.value);setPagina(1);}}>
          <option value="TODOS">Todos</option>
          <option value="vago">Vagos</option>
          <option value="USADO">Usados</option>
          <option value="equip">Equipamentos</option>
          <option value="cgnat">CGNAT</option>
          <option value="cliente">Clientes</option>
        </select>
        <button className="btn btn-primary btn-sm"  onClick={()=>setModal("add")}>+ Novo IP</button>
        <button className="btn btn-success btn-sm"  onClick={()=>setModal("gen")}>⚡ Gerar Bloco</button>
        <button className="btn btn-purple btn-sm"   onClick={()=>setModal("bulk")}>📥 Importar Lista</button>
        <button className="btn btn-orange btn-sm"   onClick={()=>exportToExcel(registros, cidade)}>📊 Exportar Excel</button>
      </div>

      {loading ? <div className="loading">Carregando...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>IP</th>
                <th>Login / Uso</th>
                {extras.map(e => <th key={e}>{e.replace(/_/g," ")}</th>)}
                <th>Data</th>
                <th>Obs</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 && (
                <tr><td colSpan={7+extras.length} className="empty">Nenhum registro.</td></tr>
              )}
              {slice.map((r, i) => {
                const tipo = classifyLogin(r.login);
                return (
                  <tr key={r.id} className={rowClass(tipo)}>
                    <td style={{color:"#475569"}}>{(pagAtual-1)*PAGE_SIZE+i+1}</td>
                    <td className="ip-cell">{r.ip}</td>
                    <td><span className={badgeClass(tipo)}>{r.login}</span></td>
                    {extras.map(e => <td key={e} className="col-extra">{r[e]||""}</td>)}
                    <td style={{color:"#64748b",fontSize:".78rem"}}>{r.data}</td>
                    <td className="obs-cell" title={r.obs}>{r.obs||""}</td>
                    <td style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                      <button className="btn btn-edit"  onClick={()=>abrirEditar(r)}>✏️</button>
                      <button className="btn btn-hist"  onClick={()=>abrirHist(r)}>📋</button>
                      <button className="btn btn-danger" onClick={()=>excluir(r.id,r.ip)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPags > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={()=>setPagina(1)} disabled={pagAtual===1}>«</button>
          <button className="page-btn" onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagAtual===1}>‹</button>
          {Array.from({length:totalPags},(_,i)=>i+1).filter(p => Math.abs(p-pagAtual)<=2||p===1||p===totalPags).reduce((acc,p,i,arr) => {
            if (i>0 && p-arr[i-1]>1) acc.push("...");
            acc.push(p); return acc;
          },[]).map((p,i) =>
            p==="..." ? <span key={"e"+i} className="page-info">...</span>
            : <button key={p} className={"page-btn"+(p===pagAtual?" active":"")} onClick={()=>setPagina(p)}>{p}</button>
          )}
          <button className="page-btn" onClick={()=>setPagina(p=>Math.min(totalPags,p+1))} disabled={pagAtual===totalPags}>›</button>
          <button className="page-btn" onClick={()=>setPagina(totalPags)} disabled={pagAtual===totalPags}>»</button>
          <span className="page-info">{filtrados.length} registros</span>
        </div>
      )}

      {modal==="add" && (
        <AddEditModal cidade={cidade} editando={false} initial={null} onClose={fechar} onSave={salvar} />
      )}
      {modal==="edit" && selecionado && (
        <AddEditModal cidade={cidade} editando={true}
          initial={registros.find(r=>r.id===selecionado)}
          onClose={fechar} onSave={salvar} />
      )}
      {modal==="bulk" && <BulkImport cidade={cidade} onClose={fechar} onDone={carregar} />}
      {modal==="gen"  && <GenerateBlock cidade={cidade} onClose={fechar} onDone={carregar} />}
      {modal==="hist" && selecionado && (
        <HistoryModal ip={selecionado.ip} cidade={toKey(cidade)} onClose={fechar} />
      )}
    </div>
  );
}