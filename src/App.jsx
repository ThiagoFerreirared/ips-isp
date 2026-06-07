import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CitiesProvider } from "./context/CitiesContext";
import { Spinner } from "./components/ui";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import IPs from "./pages/IPs";
import RelatorioLinks from "./pages/RelatorioLinks";
import HistoricoEventos from "./pages/HistoricoEventos";

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-full place-items-center bg-bg">
        <Spinner className="h-7 w-7 text-primary" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <CitiesProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="ips" element={<IPs />} />
          <Route path="relatorio" element={<RelatorioLinks />} />
          <Route path="eventos" element={<HistoricoEventos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </CitiesProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Root />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
