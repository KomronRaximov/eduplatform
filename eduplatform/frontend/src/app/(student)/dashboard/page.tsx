'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, ProgressBar, StatCard } from '../../../components/ui';
import { api } from '../../../lib/api';
import { PracticeOverview, Test } from '../../../types';

type Dashboard = { user: { firstName: string; currentDifficulty: 'EASY'|'MEDIUM'|'HARD' }; summary: { totalTests: number; averagePercentage: number; bestPercentage: number }; recommendedTests: Test[]; recentAttempts: { id: string; percentage: number; test: Test | null; finishedAt: string }[]; topicProgress: { id: string; averagePercentage: number; topic: { name: string } }[] };

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/dashboard') });
  const { data: practice } = useQuery({ queryKey: ['practice-overview'], queryFn: () => api<PracticeOverview>('/practice/overview'), retry: false });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;
  const dashboard = data!;

  return <>
    <section className="relative mb-7 overflow-hidden rounded-[28px] bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,.45),transparent_36%),radial-gradient(circle_at_10%_90%,rgba(79,70,229,.25),transparent_35%)]" />
      <div className="soft-grid absolute inset-0 opacity-15" />
      <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
        <div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-200"><Icon name="sparkles" className="h-4 w-4" />Bugungi o‘quv rejasi</span><h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Salom, {dashboard.user.firstName}! 👋</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Har bir test bilim darajangizni aniqroq belgilaydi. Bugun yana bir qadam oldinga yuring.</p></div>
        <Link href="/tests" className="btn min-w-40 bg-white text-slate-950 shadow-xl hover:-translate-y-0.5 hover:bg-violet-50">Testni boshlash<Icon name="arrow" className="h-4 w-4" /></Link>
      </div>
    </section>

    {practice && <section className="mb-7 card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Icon name="target" /></span><div><p className="eyebrow mb-1">Shaxsiy mashq</p><h2 className="text-lg font-bold text-slate-950">{practice.dueCount > 0 ? `Bugungi takrorlash: ${practice.dueCount} ta savol` : 'Bugun takrorlash yo‘q, yangi savollarni yeching'}</h2></div></div><Link href="/practice" className="btn-primary">Mashqni boshlash<Icon name="arrow" className="h-4 w-4" /></Link></section>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Joriy daraja" value={<DifficultyBadge value={dashboard.user.currentDifficulty} />} icon="target" detail="Natijalarga qarab yangilanadi" />
      <StatCard label="Topshirilgan testlar" value={dashboard.summary.totalTests} icon="tests" tone="sky" />
      <StatCard label="O‘rtacha natija" value={`${dashboard.summary.averagePercentage}%`} icon="progress" tone="amber" />
      <StatCard label="Eng yaxshi natija" value={`${dashboard.summary.bestPercentage}%`} icon="trophy" tone="emerald" />
    </section>

    <section className="mt-9"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow mb-1.5">Siz uchun</p><h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Tavsiya etilgan testlar</h2></div><Link className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-800" href="/tests">Barchasi<Icon name="arrow" className="h-4 w-4" /></Link></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboard.recommendedTests.map(test => <article key={test.id} className="card-interactive flex flex-col"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Icon name="book" /></span><DifficultyBadge value={test.difficulty} /></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-violet-600">{test.topic.name}</p><h3 className="mt-1.5 text-lg font-bold text-slate-900">{test.title}</h3><p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-slate-500">{test.description || 'Bilimingizni sinab ko‘ring va yangi darajaga chiqing.'}</p><div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500"><span className="flex items-center gap-1.5"><Icon name="question" className="h-4 w-4" />{test._count?.questions ?? 0} savol</span><span className="flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4" />{test.durationMinutes ?? '—'} daqiqa</span><Link className="ml-auto grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-violet-600" href={`/tests/${test.id}`} aria-label={`${test.title} testini boshlash`}><Icon name="arrow" className="h-4 w-4" /></Link></div></article>)}{!dashboard.recommendedTests.length && <EmptyState title="Tavsiyalar tayyorlanmoqda" description="Mavjud testlardan birini ishlang — keyingi tavsiyalar natijangiz asosida shakllanadi." action={{ href: '/tests', label: 'Testlarni ko‘rish' }} />}</div>
    </section>

    <section className="mt-9 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="card"><div className="flex items-center justify-between"><div><p className="eyebrow mb-1">Faollik</p><h2 className="text-lg font-bold">Oxirgi natijalar</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-600"><Icon name="history" /></span></div><div className="mt-5 space-y-1">{dashboard.recentAttempts.map(attempt => <Link href={`/attempts/${attempt.id}/result`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50" key={attempt.id}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${attempt.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : attempt.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{Math.round(attempt.percentage)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{attempt.test?.title ?? 'Shaxsiy mashq'}</p><p className="mt-0.5 text-xs text-slate-400">{new Date(attempt.finishedAt).toLocaleDateString('uz-UZ')}</p></div><Icon name="arrow" className="h-4 w-4 text-slate-300" /></Link>)}{!dashboard.recentAttempts.length && <EmptyState title="Natijalar hali yo‘q" description="Birinchi testingizdan keyin natijalar shu yerda ko‘rinadi." icon="history" />}</div></div>
      <div className="card"><div className="flex items-center justify-between"><div><p className="eyebrow mb-1">O‘sish</p><h2 className="text-lg font-bold">Mavzular bo‘yicha progress</h2></div><Link href="/progress" className="text-sm font-bold text-violet-600">Batafsil</Link></div><div className="mt-6 space-y-5">{dashboard.topicProgress.map(progress => <div key={progress.id}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="font-semibold text-slate-700">{progress.topic.name}</span><span className="font-bold text-slate-900">{progress.averagePercentage}%</span></div><ProgressBar value={progress.averagePercentage} /></div>)}{!dashboard.topicProgress.length && <EmptyState title="Progress shakllanmoqda" description="Birinchi testdan keyin mavzular kesimidagi ko‘rsatkichlar paydo bo‘ladi." icon="progress" />}</div></div>
    </section>
  </>;
}
