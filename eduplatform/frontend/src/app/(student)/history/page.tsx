'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader } from '../../../components/ui';
import { api } from '../../../lib/api';
import { Attempt } from '../../../types';

export default function HistoryPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['history'], queryFn: () => api<Attempt[]>('/attempts/history') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;

  return <>
    <PageHeader eyebrow="Faollik tarixi" title="Natijalaringiz" description="Barcha yakunlangan testlar va erishilgan natijalarni bir joyda kuzating." />
    {!data?.length ? <EmptyState title="Hali natijalar mavjud emas" description="Birinchi testingizni yakunlang — natija va tavsiyalar shu yerda saqlanadi." icon="history" action={{ href: '/tests', label: 'Testni boshlash' }} /> : <>
      <div className="grid gap-3 md:hidden">{data.map(attempt => <Link href={`/attempts/${attempt.id}/result`} key={attempt.id} className="card flex items-center gap-4 p-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-bold ${attempt.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : attempt.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{Math.round(attempt.percentage)}%</span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold text-slate-900">{attempt.test?.title ?? 'Shaxsiy mashq'}</h2><p className="mt-1 truncate text-xs text-slate-500">{attempt.test?.topic.name ?? 'Mashq'} · {attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleDateString('uz-UZ') : '—'}</p></div><Icon name="arrow" className="h-4 w-4 text-slate-300" /></Link>)}</div>
      <div className="table-shell hidden overflow-x-auto md:block"><table className="data-table min-w-[760px]"><thead><tr><th>Test</th><th>Mavzu</th><th>Daraja</th><th>Natija</th><th>Sana</th><th /></tr></thead><tbody>{data.map(attempt => <tr key={attempt.id}><td><p className="font-semibold text-slate-900">{attempt.test?.title ?? 'Shaxsiy mashq'}</p></td><td>{attempt.test?.topic.name ?? 'Mashq'}</td><td><DifficultyBadge value={attempt.difficulty} /></td><td><span className={`font-bold ${attempt.percentage >= 80 ? 'text-emerald-600' : attempt.percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{attempt.percentage}%</span></td><td>{attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleDateString('uz-UZ') : '—'}</td><td><Link href={`/attempts/${attempt.id}/result`} className="inline-grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-100 hover:text-violet-600"><Icon name="arrow" className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div>
    </>}
  </>;
}
