import { createContext, useContext, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

// ===================== CONTEXT =====================
const ToastContext = createContext(null);

// ===================== ICONS =====================
const ICONS = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

// ===================== SINGLE TOAST =====================
function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`toast toast-${toast.type} relative overflow-hidden`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm leading-tight mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm leading-snug opacity-90">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none ml-1 -mr-1"
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="toast-progress" />
    </div>
  );
}

// ===================== PROVIDER =====================
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message, type = "info", title = "", duration = 4000) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const toast = {
    success: (msg, title) => add(msg, "success", title),
    error: (msg, title) => add(msg, "error", title),
    info: (msg, title) => add(msg, "info", title),
    warning: (msg, title) => add(msg, "warning", title),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-container">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={remove} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

// ===================== HOOK =====================
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
