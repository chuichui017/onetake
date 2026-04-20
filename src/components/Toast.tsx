'use client';

import { useStudio } from '@/lib/store';

export function Toast() {
  const toast = useStudio((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast-layer" role="status" aria-live="polite">
      <div className="toast">{toast}</div>
    </div>
  );
}
