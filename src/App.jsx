import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase/config";
import Login from "./pages/Login";
import IPTable from "./pages/IPTable";
import GlobalSearch from "./components/GlobalSearch";

const DEFAULT_CIDADES = [
  "SANTAREM","MANAUS","ITAITUBA","RUROPOLIS",
  "ALTAMIRA_ALENQUER","ALENQUER","SAPEZAL_CJ","VILHENA",
  "COMODORO","PRIVADO_BACKBONE","IPV6_WSP",
];

const toKey = c => c.replace(/[\/\s]/g, "_").toUpperCase();

async function deletarColecao(cidadeKey) {
  const colRef = collection(db, "ips_" + cidadeKey);
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "ips_" + cidadeKey, d.id))));
}

function Main() {
  const { user, logout } = useAuth();
  const [cidades, setCidades] = useState(DEFAULT_CIDADES);
  const [cidade, setCidade] = useState("SANTAREM");
  const [loadingCidades, setLoadingCidades] = useState(true);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "config", "cidades")).then(snap => {
      if (snap.exists()) setCidades(snap.data().lista);
      setLoadingCidades(false);
    }).catch(() => setLoadingCidades(false));
  }, [user]);

  useEffect(() => {
    if (!user || loadingCidades) return;
    setDoc(doc(db, "config", "cidades"), { lista: cidades });
  }, [cidades]);

  if (!user) return <Login />;
  if (loadingCidades) return <div style={{padding:"2rem",color:"#94a3b8"}}>Carregando...</div>;

  function addCidade() {
    const nome = prompt("Nome da nova aba (ex: NOVO_SITE):");
    if (!nome) return;
    const key = nome.trim().toUpperCase().replace(/\s+/g, "_");
    if (cidades.includes(key)) { 
      alert("Já existe!"); 
      return; 
    }
    setCidades(c => [...c, key]);
    setCidade(key);
  }

  async function deletarCidade(key) {
    if (!confirm(`Deletar a cidade ${key}?\n\nIsso vai remover a aba e TODOS os IPs dela do Firebase. Não pode ser desfeito.`)) return;
    try {
      await deletarColecao(toKey(key));
      setCidades(c => c.filter(x => x !== key));
      if (cidade === key) {
        const restante = cidades.find(x => x !== key);
        setCidade(restante || DEFAULT_CIDADES[0] || "");
      }
    } catch (err) {
      alert("Erro ao deletar: " + err.message);
    }
  }

  function onDragStart(idx) {
    setDragIdx(idx);
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    const nova = [...cidades];
    const [moved] = nova.splice(dragIdx, 1);
    nova.splice(idx, 0, moved);
    setCidades(nova);
    setDragIdx(idx);
  }

  function onDragEnd() {
    setDragIdx(null);
  }

  return (
    <div>
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.5rem" }}>🌐</span>
          <h1>Gerenciador de IPs — ISP</h1>
        </div>
        <div className="header-right">
          <GlobalSearch onSelect={(c) => setCidade(c)} />
          <span className="user-info">👤 {user.email}</span>
          <button className="btn btn-cancel btn-sm" onClick={logout}>Sair</button>
        </div>
      </div>

      <div className="tabs">
        {cidades.map((c, idx) => (
          <div
            key={c}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              opacity: dragIdx === idx ? 0.5 : 1,
              cursor: "grab",
            }}
            onMouseEnter={() => setHoveredTab(c)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <button
              className={"tab-btn" + (cidade === c ? " active" : "")}
              onClick={() => setCidade(c)}
              style={{ paddingRight: hoveredTab === c ? "28px" : undefined }}
            >
              {c.replace(/_/g, " ")}
            </button>

            {hoveredTab === c && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletarCidade(c);
                }}
                title={`Deletar ${c}`}
                style={{
                  position: "absolute",
                  right: "4px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "#ef4444",
                  lineHeight: 1,
                  padding: "2px 3px",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button className="tab-add" onClick={addCidade}>
          + Nova cidade
        </button>
      </div>

      <div className="content">
        <IPTable cidade={cidade} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </BrowserRouter>
  );
}
