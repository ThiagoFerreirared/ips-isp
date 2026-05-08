import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [erro, setErro]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await login(email, pass);
    } catch {
      setErro("E-mail ou senha incorretos.");
    }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>🌐 IPs ISP</h1>
        <p>Entre com sua conta para acessar o sistema.</p>
        {erro && <div className="auth-error">{erro}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginTop:"8px"}} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}