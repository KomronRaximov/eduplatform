'use client';

import { useEffect, useRef } from 'react';
import { Icon } from './icons';

type Props = { open: boolean; title: string; description: string; confirmLabel: string; cancelLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void };

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Davom etish', busy = false, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onCancel}>
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl sm:p-8" onClick={event => event.stopPropagation()}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Icon name="check" className="h-6 w-6" /></span>
      <h2 id="confirm-title" className="mt-5 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
        <button ref={confirmRef} className="btn-primary" onClick={onConfirm} disabled={busy}>{busy ? 'Hisoblanmoqda…' : confirmLabel}</button>
      </div>
    </div>
  </div>;
}
