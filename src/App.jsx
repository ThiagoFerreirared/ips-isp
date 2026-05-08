import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import IPTable from "./pages/IPTable";
import GlobalSearch from "./components/GlobalSearch";

const DEFAULT_CIDADES = [
  "SANTAREM",
  "MANAUS",
  "ITAITUBA",
  "RUROPOLIS",
  "ALTAMIRA_ALENQUER",
  "ALENQUER",
  "SAPEZAL_CJ",
  "VILHENA",
  "COMODORO",
  "PRIVADO_BACKBONE",
  "IPV6_WSP",
];

function Main() {
  const { user, logout } = useAuth();
  const [cidades, setCidades] = useState(DEFAULT_CIDADES);
  const [cidade, setCidade] = useState("SANTAREM");

  if (!user) return <Login />;

  function addCidade() {
    const nome = prompt("Nome da nova aba (ex: NOVO_SITE):");
    if (!nome) return;

    const key = nome.trim().toUpperCase().replace(/\s+/g, "_");
    if (cidades.includes(key)) {
      alert("Já existe!");
      return;
    }

    setCidades((c) => [...c, key]);
    setCidade(key);
  }

  function deletarCidade() {
    const alvo = prompt("Digite exatamente o nome da cidade/aba para deletar:");
    if (!alvo) return;

    const key = alvo.trim().toUpperCase().replace(/\s+/g, "_");
    if (!cidades.includes(key)) {
      alert("Cidade não encontrada!");
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja deletar a cidade ${key}? Isso vai remover a aba do sistema.`
      )
    ) {
      return;
    }

    setCidades((c) => c.filter((x) => x !== key));
    if (cidade === key) {
      const restante = cidades.find((x) => x !== key);
      setCidade(restante || DEFAULT_CIDADES[0] || "");
    }
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
          <button className="btn btn-cancel btn-sm" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      <div className="tabs">
        {cidades.map((c) => (
          <button
            key={c}
            className={"tab-btn" + (cidade === c ? " active" : "")}
            onClick={() => setCidade(c)}
          >
            {c.replace(/_/g, " ")}
          </button>
        ))}
        <button className="tab-add" onClick={addCidade}>
          + Nova cidade
        </button>
        <button className="tab-add" onClick={deletarCidade}>
          🗑️ Deletar cidade
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