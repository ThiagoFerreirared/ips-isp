import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import IPTable from "./pages/IPTable";

const CIDADES = [
  "SANTAREM", "MANAUS", "ITAITUBA", "RUROPOLIS",
  "ALTAMIRA/ALENQUER", "ALENQUER", "SAPEZAL/CJ", "VILHENA",
  "COMODORO", "PRIVADO BACKBONE", "IPV6 WSP"
];

export default function App() {
  const [cidade, setCidade] = useState("SANTAREM");

  return (
    <BrowserRouter>
      <div>
        <div className="app-header">
          <span style={{ fontSize: "1.6rem" }}>🌐</span>
          <h1>Gerenciador de IPs — ISP</h1>
        </div>
        <div className="tabs">
          {CIDADES.map(c => (
            <button
              key={c}
              className={"tab-btn" + (cidade === c ? " active" : "")}
              onClick={() => setCidade(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="content">
          <IPTable cidade={cidade} />
        </div>
      </div>
    </BrowserRouter>
  );
}
