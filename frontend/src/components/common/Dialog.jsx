import { useEffect } from "react";

import { X } from "lucide-react";
export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Dialog({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[90vh] overflow-y-auto bg-white rounded-12 shadow-xl p-6`}
      >
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <h2 className="font-heading font-700 text-lg text-slate-900">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              title="Đóng"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-lg leading-none transition-colors cursor-pointer flex-shrink-0"
            >
              <X size="1em" className="inline-block align-[-0.125em] shrink-0" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
