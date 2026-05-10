import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      await login(email, senha);
    } catch {
      setErro("Email ou senha incorretos.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0f1e"
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 12, padding: "40px 36px", width: "100%", maxWidth: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>🌐</div>
          <h1 style={{ color: "#60a5fa", fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>WSP FIBRA</h1>
          <p style={{ color: "#475569", fontSize: "0.82rem", marginTop: 4 }}>Sistema de Documentação ISP</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.8rem", display: "block", marginBottom: 4 }}>Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #1e293b", background: "#1e293b",
                color: "#e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box"
              }}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.8rem", display: "block", marginBottom: 4 }}>Senha</label>
            <input
              type="password" required value={senha}
              onChange={e => setSenha(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #1e293b", background: "#1e293b",
                color: "#e2e8f0", fontSize: "0.9rem", outline: "none", boxSizing: "border-box"
              }}
              placeholder="••••••••"
            />
          </div>
          {erro && <div style={{ color: "#f87171", fontSize: "0.82rem", textAlign: "center" }}>{erro}</div>}
          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: "11px", borderRadius: 8, border: "none",
              background: loading ? "#1e3a5f" : "#3b82f6", color: "#fff",
              fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
