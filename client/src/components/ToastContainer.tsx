import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Toast, ToastType } from '../hooks/useToast';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
  warning: 'border-yellow-200 bg-yellow-50',
};

interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-up ${styles[t.type]}`}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm text-gray-800">{t.message}</p>
          <button
            onClick={() => onRemove(t.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
