import React from "react";
import html from "../assets/operational-tools.html?raw";
export default function Ferramentas() {
  return <div className="space-y-3 p-4"><h1 className="text-xl font-extrabold">Central de Atividades Operacionais</h1><p className="text-sm text-muted">Relatórios e preferências são salvos neste navegador, sem sincronização entre computadores. A consulta Nokia usa uma base carregada localmente.</p><iframe title="Central de ferramentas operacionais" srcDoc={html} className="w-full rounded-xl border border-border" style={{height:"calc(100vh - 180px)",minHeight:600}} sandbox="allow-scripts allow-same-origin allow-downloads allow-modals" allow="clipboard-write" /></div>;
}
