import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, Info, X, AlertTriangle } from "lucide-react";
import { Modal, Button } from "../components/ui";
import { cn } from "../lib/cn";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let counter = 0;

const TOAST_STYLE = {
  success: { icon: CheckCircle2, ring: "text-emerald-500", bar: "bg-emerald-500" },
  error: { icon: XCircle, ring: "text-red-500", bar: "bg-red-500" },
  info: { icon: Info, ring: "text-sky-500", bar: "bg-sky-500" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, msg, opts = {}) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, type, msg }]);
      if (opts.duration !== 0) setTimeout(() => remove(id), opts.duration || 3600);
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
      confirm: (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })),
    }),
    [push]
  );

  const resolveConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Viewport */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5">
        {toasts.map((t) => {
          const s = TOAST_STYLE[t.type] || TOAST_STYLE.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              className="card anim-toast pointer-events-auto flex items-start gap-3 overflow-hidden p-3.5 pl-4"
            >
              <span className={cn("absolute left-0 top-0 h-full w-1", s.bar)} />
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.ring)} />
              <p className="flex-1 text-sm leading-snug text-text-soft">{t.msg}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-muted transition hover:text-text"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <Modal
          size="sm"
          onClose={() => resolveConfirm(false)}
          title={confirmState.title || "Confirmar"}
          icon={AlertTriangle}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => resolveConfirm(false)}>
                {confirmState.cancelLabel || "Cancelar"}
              </Button>
              <Button
                variant={confirmState.danger ? "danger" : "primary"}
                size="sm"
                onClick={() => resolveConfirm(true)}
              >
                {confirmState.confirmLabel || "Confirmar"}
              </Button>
            </>
          }
        >
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-soft">
            {confirmState.message}
          </p>
        </Modal>
      )}
    </ToastContext.Provider>
  );
}
