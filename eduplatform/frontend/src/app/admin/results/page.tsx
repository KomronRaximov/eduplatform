'use client';

import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader, StatCard } from '../../../components/ui';
import { api, downloadFile } from '../../../lib/api';
import { ResultList, ResultRow, Test, Topic } from '../../../types';

type Filters = { search: string; topicId: string; testId: string; status: '' | 'PASSED' | 'FAILED'; kind: '' | 'TEST' | 'PRACTICE' };
const emptyFilters: Filters = { search: '', topicId: '', testId: '', status: '', kind: '' };
const PAGE_SIZE = 20;

const toQuery = (filters: Filters, extra: Record<string, string | number> = {}) => {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => { if (value !== '' && value !== undefined) params.set(key, String(value)); });
  return params.toString();
};

const percentTone = (value: number) => value >= 80 ? 'text-emerald-600' : value >= 50 ? 'text-amber-600' : 'text-rose-600';
const percentBadge = (value: number) => value >= 80 ? 'bg-emerald-100 text-emerald-700' : value >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
const formatDate = (value: string) => new Date(value).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function StatusBadge({ row, pass }: { row: ResultRow; pass: number }) {
  const passed = row.percentage >= pass;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{passed ? 'O‘tdi' : 'Yiqildi'}</span>;
}

export default function AdminResultsPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setFilters(current => current.search === searchInput.trim() ? current : { ...current, search: searchInput.trim() }), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => setPage(1), [filters]);

  const topics = useQuery({ queryKey: ['admin', 'topics'], queryFn: () => api<Topic[]>('/admin/topics') });
  const tests = useQuery({ queryKey: ['admin', 'tests', 'by-topic', filters.topicId], queryFn: () => api<{ items: Test[] }>(`/admin/tests?limit=100${filters.topicId ? `&topicId=${filters.topicId}` : ''}`) });
  const results = useQuery({ queryKey: ['admin', 'results', filters, page], queryFn: () => api<ResultList>(`/admin/results?${toQuery(filters, { page, limit: PAGE_SIZE })}`), placeholderData: keepPreviousData });

  const update = (patch: Partial<Filters>) => setFilters(current => ({ ...current, ...patch }));
  const hasFilters = searchInput !== '' || Object.entries(filters).some(([key, value]) => key !== 'search' && value !== '');
  const reset = () => { setSearchInput(''); setFilters(emptyFilters); };

  const exportCsv = async () => {
    setExporting(true); setExportError('');
    try { await downloadFile(`/admin/results/export?${toQuery(filters)}`, `natijalar-${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (caught) { setExportError((caught as Error).message); }
    finally { setExporting(false); }
  };

  if (results.isLoading) return <Loading />;
  if (results.error) return <ErrorBox message={results.error.message} />;
  const data = results.data!;
  const pass = data.summary.passPercentage;

  const action = <button className="btn-secondary" onClick={exportCsv} disabled={exporting || !data.summary.total}><Icon name="arrow" className="h-4 w-4 rotate-90" />{exporting ? 'Tayyorlanmoqda…' : 'Excel (CSV) yuklab olish'}</button>;

  return <>
    <PageHeader eyebrow="Baholash" title="Natijalar" description="Talabalar qaysi testni qachon topshirgani va qancha ball olganini kuzating." action={action} />
    {exportError && <div className="mb-4"><ErrorBox message={exportError} /></div>}

    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label="Topshirilgan" value={data.summary.total} icon="tests" tone="sky" detail={hasFilters ? 'Tanlangan filtr bo‘yicha' : 'Barcha urinishlar'} />
      <StatCard label="O‘rtacha natija" value={`${data.summary.averagePercentage}%`} icon="progress" />
      <StatCard label="O‘tganlar" value={data.summary.passed} icon="check" tone="emerald" detail={`${pass}% va undan yuqori`} />
      <StatCard label="Yiqilganlar" value={data.summary.failed} icon="close" tone="amber" detail={`${pass}% dan past`} />
    </div>

    <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="text-xs font-semibold text-slate-500">Talaba<input className="input" placeholder="Ism, familiya yoki email" value={searchInput} onChange={e => setSearchInput(e.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-500">Mavzu<select className="input" value={filters.topicId} onChange={e => update({ topicId: e.target.value, testId: '' })}><option value="">Barchasi</option>{topics.data?.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Test<select className="input" value={filters.testId} onChange={e => update({ testId: e.target.value })}><option value="">Barchasi</option>{tests.data?.items.map(test => <option key={test.id} value={test.id}>{test.title}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Holat<select className="input" value={filters.status} onChange={e => update({ status: e.target.value as Filters['status'] })}><option value="">Barchasi</option><option value="PASSED">O‘tdi</option><option value="FAILED">Yiqildi</option></select></label>
      <label className="text-xs font-semibold text-slate-500">Turi<select className="input" value={filters.kind} onChange={e => update({ kind: e.target.value as Filters['kind'] })}><option value="">Barchasi</option><option value="TEST">Test</option><option value="PRACTICE">Shaxsiy mashq</option></select></label>
      <button className="btn-secondary min-h-11" onClick={reset} disabled={!hasFilters}>Tozalash</button>
    </div>

    {!data.items.length ? <EmptyState title={hasFilters ? 'Mos natija topilmadi' : 'Hali natijalar yo‘q'} description={hasFilters ? 'Filtrlarni o‘zgartirib ko‘ring.' : 'Talabalar test topshirgach, natijalari shu yerda paydo bo‘ladi.'} icon="trophy" /> : <>
      <div className={`grid gap-3 md:hidden ${results.isFetching ? 'opacity-60' : ''}`}>{data.items.map(row => <Link href={`/admin/results/${row.id}`} key={row.id} className="card flex items-center gap-4 p-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-bold ${percentBadge(row.percentage)}`}>{Math.round(row.percentage)}%</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{row.user.firstName} {row.user.lastName}</p><p className="mt-0.5 truncate text-xs text-slate-600">{row.test?.title ?? 'Shaxsiy mashq'} · {row.correctAnswers}/{row.totalQuestions}</p><p className="mt-0.5 truncate text-xs text-slate-400">{formatDate(row.finishedAt)}</p></div>
        <Icon name="arrow" className="h-4 w-4 text-slate-300" /></Link>)}</div>

      <div className={`table-shell hidden overflow-x-auto md:block ${results.isFetching ? 'opacity-60' : ''}`}><table className="data-table min-w-[980px]"><thead><tr><th>Talaba</th><th>Test</th><th>Daraja</th><th>To‘g‘ri</th><th>Ball</th><th>Natija</th><th>Holat</th><th>Sana</th><th /></tr></thead><tbody>{data.items.map(row => { const initials = `${row.user.firstName[0] ?? ''}${row.user.lastName[0] ?? ''}`.toUpperCase(); return <tr key={row.id}>
        <td><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700">{initials}</span><div className="min-w-0"><b className="block truncate text-slate-900">{row.user.firstName} {row.user.lastName}</b><span className="block truncate text-xs text-slate-400">{row.user.email}</span></div></div></td>
        <td><p className="font-semibold text-slate-900">{row.test?.title ?? 'Shaxsiy mashq'}</p><p className="text-xs text-slate-400">{row.test?.topic.name ?? 'Mashq'}</p></td>
        <td><DifficultyBadge value={row.difficulty} /></td>
        <td>{row.correctAnswers} / {row.totalQuestions}</td>
        <td className="font-semibold text-slate-700">{row.score}</td>
        <td><span className={`font-bold ${percentTone(row.percentage)}`}>{row.percentage}%</span></td>
        <td><StatusBadge row={row} pass={pass} /></td>
        <td className="whitespace-nowrap">{formatDate(row.finishedAt)}</td>
        <td><Link href={`/admin/results/${row.id}`} aria-label="Batafsil" className="inline-grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-100 hover:text-violet-600"><Icon name="arrow" className="h-4 w-4" /></Link></td>
      </tr>; })}</tbody></table></div>

      {data.meta.totalPages > 1 && <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.meta.total)} / {data.meta.total}</span>
        <div className="flex gap-2"><button className="btn-secondary min-h-9 px-3 py-1.5" disabled={page <= 1 || results.isFetching} onClick={() => setPage(p => p - 1)}>Oldingi</button><button className="btn-secondary min-h-9 px-3 py-1.5" disabled={page >= data.meta.totalPages || results.isFetching} onClick={() => setPage(p => p + 1)}>Keyingi</button></div>
      </div>}
    </>}
  </>;
}
