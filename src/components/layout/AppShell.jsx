import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Globe, Share2, CalendarClock, ClipboardList, Search, Sun, Moon, LogOut, Menu, X, ChevronDown, Layers } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import CommandPalette from "../CommandPalette";
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/ips", label: "IPs", icon: Globe },
  { to: "/ocorrencias", label: "Ocorrências", icon: ClipboardList },
  { to: "/relatorio", label: "Relatório de Links", icon: Share2 },
  { to: "/ferramentas", label: "Central Operacional", icon: Layers },
  { to: "/eventos", label: "Histórico de Eventos", icon: CalendarClock },
];
export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const loc = useLocation();
  const current = NAV.find(n=>n.to === loc.pathname) || NAV[0];
  const Icon = current.icon;
  useEffect(() => setDrawer(false), [loc.pathname]);
  useEffect(() => {
    const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); } if(e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const sidebar = <><nav className="workspace-nav" aria-label="Navegação principal">{NAV.map(({to,label,icon:NavIcon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>"workspace-nav-item"+(isActive?" selected":"")}><NavIcon size={16}/><span>{label}</span></NavLink>)}</nav><div className="workspace-sidebar-footer"><span className="workspace-avatar">{(user?.email || "W").slice(0,1).toUpperCase()}</span><span className="truncate" title={user?.email}>{user?.email}</span><button className="workspace-icon" onClick={logout} title="Sair" aria-label="Sair"><LogOut size={15}/></button></div></>;
  return <div className="workspace-shell">
    <header className="workspace-titlebar"><button className="workspace-icon workspace-mobile-toggle" aria-label={drawer?"Fechar menu":"Abrir menu"} aria-expanded={drawer} onClick={()=>setDrawer(!drawer)}>{drawer?<X size={17}/>:<Menu size={17}/>}</button><div className="workspace-brand"><Globe size={15}/><b>WSP FIBRA</b><ChevronDown size={13}/></div><div className="workspace-tab"><Icon size={14}/>{current.label}</div><div className="workspace-title-actions"><button className="workspace-icon" onClick={toggle} aria-label={theme === "dark"?"Tema claro":"Tema escuro"} title="Alternar tema">{theme === "dark"?<Sun size={16}/>:<Moon size={16}/>}</button></div></header>
    <div className="workspace-body"><aside className="workspace-sidebar">{sidebar}</aside>{drawer && <div className="workspace-mobile-drawer"><button className="workspace-drawer-backdrop" aria-label="Fechar menu" onClick={()=>setDrawer(false)}/><aside>{sidebar}</aside></div>}
      <div className="workspace-center"><div className="workspace-toolbar"><button className="workspace-search" onClick={()=>setPalette(true)}><Search size={16}/><span>Buscar IP, cidade, link…</span><kbd>Ctrl K</kbd><span className="workspace-search-action">Buscar</span></button></div><div className="workspace-sectionbar"><Icon size={16}/><strong>{current.label}</strong><span className="workspace-section-note">Sistema de Documentação ISP</span></div><main className="workspace-content"><Outlet/></main></div>
    </div>{palette && <CommandPalette onClose={()=>setPalette(false)}/>}</div>;
}
