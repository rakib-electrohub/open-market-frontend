import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { setGlobalToastFn } from "@/components/ui/use-toast";
import { CheckCircle2, Trash2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  delete: <Trash2 className="w-4 h-4 text-orange-400 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,
};

export function PersistentToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    setGlobalToastFn(addToast);
    return () => setGlobalToastFn(null);
  }, [addToast]);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl border border-gray-700 min-w-[220px] max-w-xs animate-in slide-in-from-right-5">
            {ICONS[t.type] || ICONS.info}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function usePersistentToast() {
  return useContext(ToastContext);
}