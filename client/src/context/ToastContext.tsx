import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = { id, message, type, title, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 visible

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, title?: string) => toast(msg, 'success', title), [toast]);
  const error = useCallback((msg: string, title?: string) => toast(msg, 'error', title), [toast]);
  const info = useCallback((msg: string, title?: string) => toast(msg, 'info', title), [toast]);
  const warning = useCallback((msg: string, title?: string) => toast(msg, 'warning', title), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/20'
                : t.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/20'
                : t.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-amber-200 shadow-amber-950/20'
                : 'bg-slate-900/95 border-cyan-500/40 text-cyan-200 shadow-cyan-950/20'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {t.title && <h5 className="text-xs font-bold text-slate-100 mb-0.5">{t.title}</h5>}
              <p className="text-xs text-slate-300 leading-relaxed break-words">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-md hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
