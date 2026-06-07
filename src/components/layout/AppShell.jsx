import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Globe, Share2, CalendarClock,
  Search, Sun, Moon, LogOut, Menu, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../lib/cn";
import CommandPalette from "../CommandPalette";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/ips", label: "IPs", icon: Globe },
  { to: "/relatorio", label: "Relatório de Links", icon: Share2 },
  { to: "/eventos", label: "Histórico de Eventos", icon: CalendarClock },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const loc = useLocation();

  useEffect(() => setDrawer(false), [loc.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-lg">🌐</span>
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight text-text">WSP FIBRA</div>
          <div className="text-[0.68rem] font-medium uppercase tracking-wide text-muted">Sistema ISP</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-text-soft hover:bg-surface-2 hover:text-text"
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold uppercase text-primary">
            {(user?.email || "?").slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted" title={user?.email}>
            {user?.email}
          </span>
          <button
            onClick={logout}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-red-500"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">{sidebar}</aside>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="anim-fade absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="anim-fade absolute left-0 top-0 h-full w-64 border-r border-border bg-surface">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur md:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 md:hidden"
            onClick={() => setDrawer(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setPalette(true)}
            className="group flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-sm text-muted transition hover:border-border-strong md:max-w-md"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Buscar IP, cidade, link…</span>
            <kbd className="hidden sm:inline">Ctrl K</kbd>
          </button>

          <div className="flex-1" />

          <button
            onClick={toggle}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {palette && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  );
}
