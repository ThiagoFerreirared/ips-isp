import React, { useState } from "react";
import { Globe, Sun, Moon, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button, Input, Field, Spinner } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await login(email, senha);
    } catch {
      setErro("Email ou senha incorretos.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-bg p-4">
      {/* glow de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <button
        onClick={toggle}
        className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text"
        title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="card relative w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-3xl">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-text">WSP FIBRA</h1>
          <p className="mt-1 text-sm text-muted">Sistema de Documentação ISP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {erro && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-center text-sm text-red-400">
              {erro}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full !py-3">
            {loading ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
