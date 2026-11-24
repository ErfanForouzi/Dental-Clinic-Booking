import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg ${
          isSuccess
            ? 'border-[#B8DDD5] bg-white text-[#0D223A]'
            : 'border-rose-200 bg-white text-[#0D223A]'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0F766E]" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        )}
        <p className="text-sm leading-snug text-[#0D223A]">{toast.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-2 rounded-md p-1 text-[#4E647B] transition-colors hover:bg-[#F4F8FB] hover:text-[#0D223A]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
