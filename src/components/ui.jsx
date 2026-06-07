import React, { useEffect } from "react";
import { X, Loader2, Inbox } from "lucide-react";
import { cn } from "../lib/cn";
import { TIPO_META } from "../lib/classify";

/* ───────────────────────── Button ───────────────────────── */
const VARIANTS = {
  primary: "btn-primary",
  success: "btn-success",
  purple: "btn-purple",
  orange: "btn-orange",
  danger: "btn-danger",
  ghost: "btn-ghost",
  soft: "btn-soft",
};
const SIZES = { md: "", sm: "btn-sm", xs: "btn-xs", icon: "btn-icon", "icon-sm": "btn-icon btn-sm" };

export function Button({ variant = "primary", size = "md", className, children, ...props }) {
  return (
    <button className={cn("btn", VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

/* ───────────────────────── Inputs ───────────────────────── */
export function Input({ className, ...props }) {
  return <input className={cn("input", className)} {...props} />;
}
export function Textarea({ className, ...props }) {
  return <textarea className={cn("input", className)} {...props} />;
}
export function Select({ className, children, ...props }) {
  return (
    <select className={cn("input", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, className, children }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/* ───────────────────────── Badge ───────────────────────── */
export function Badge({ tipo, className, children }) {
  const meta = tipo ? TIPO_META[tipo] : null;
  return (
    <span className={cn("badge", meta?.badge, className)}>
      {tipo && <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta?.dot }} />}
      {children ?? meta?.label}
    </span>
  );
}

/* ───────────────────────── Card ───────────────────────── */
export function Card({ className, children, ...props }) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

/* ───────────────────────── Spinner / Loading ───────────────────────── */
export function Spinner({ className }) {
  return <Loader2 className={cn("animate-spin", className)} />;
}
export function Loading({ label = "Carregando..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="h-6 w-6 text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ───────────────────────── EmptyState ───────────────────────── */
export function EmptyState({ icon: Icon = Inbox, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold text-text">{title}</p>
      {desc && <p className="max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */
const MODAL_SIZE = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open = true, onClose, title, icon: Icon, size = "md", children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={cn("card anim-pop my-auto w-full overflow-hidden", MODAL_SIZE[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-text">
              {Icon && <Icon className="h-5 w-5 text-primary" />}
              {title}
            </h2>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
              aria-label="Fechar"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-border bg-surface-2/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
