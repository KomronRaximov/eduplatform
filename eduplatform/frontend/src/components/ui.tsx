import Link from 'next/link';
import { Difficulty } from '../types';
import { Icon, IconName } from './icons';

export const difficultyLabel: Record<Difficulty, string> = { EASY: 'Oson', MEDIUM: 'O‘rta', HARD: 'Qiyin' };

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-950/20"><Icon name="book" className="h-5 w-5" /></span>{!compact && <span><b className="block text-[17px] font-bold tracking-tight">AdaptEdu</b><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">Smart learning</span></span>}</div>;
}

export function DifficultyBadge({ value }: { value: Difficulty }) {
  const colors = { EASY: 'border-emerald-200 bg-emerald-50 text-emerald-700', MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700', HARD: 'border-rose-200 bg-rose-50 text-rose-700' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${colors[value]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{difficultyLabel[value]}</span>;
}

export function Loading() {
  return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" /><p className="mt-4 text-sm font-medium text-slate-500">Ma’lumotlar yuklanmoqda…</p></div></div>;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-100"><Icon name="close" className="h-4 w-4" /></span><div><b className="block">Xatolik yuz berdi</b><p className="mt-0.5 text-rose-600">{message}</p></div></div>;
}

export function EmptyState({ title, description, icon = 'sparkles', action }: { title: string; description: string; icon?: IconName; action?: { href: string; label: string } }) {
  return <div className="col-span-full rounded-[22px] border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Icon name={icon} /></span><h3 className="mt-4 font-bold text-slate-800">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <Link href={action.href} className="btn-primary mt-5">{action.label}<Icon name="arrow" className="h-4 w-4" /></Link>}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p>}</div>{action}</header>;
}

export function StatCard({ label, value, icon, tone = 'violet', detail }: { label: string; value: React.ReactNode; icon: IconName; tone?: 'violet' | 'emerald' | 'amber' | 'sky'; detail?: string }) {
  const tones = { violet: 'bg-violet-100 text-violet-600', emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600', sky: 'bg-sky-100 text-sky-600' };
  return <div className="card relative overflow-hidden"><div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-50" /><div className="relative flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">{label}</p><div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</div>{detail && <p className="mt-2 text-xs text-slate-400">{detail}</p>}</div><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}><Icon name={icon} /></span></div></div>;
}

export function ProgressBar({ value, color = 'from-violet-500 to-indigo-500' }: { value: number; color?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${safe}%` }} /></div>;
}
