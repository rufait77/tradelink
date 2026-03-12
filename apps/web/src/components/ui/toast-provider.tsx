'use client';
import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#0f172a',
          border: '1px solid #334155',
          color: '#f1f5f9',
          borderRadius: '12px',
        },
        classNames: {
          success: 'border-emerald-500/30',
          error: 'border-red-500/30',
          warning: 'border-amber-500/30',
          info: 'border-blue-500/30',
        },
      }}
      richColors
      closeButton
    />
  );
}
