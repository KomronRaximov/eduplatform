'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Icon } from '../../../../components/icons';
import { DifficultyBadge, ErrorBox, Loading, ProgressBar, StatCard } from '../../../../components/ui';
import { api } from '../../../../lib/api';
import { ResultDetail } from '../../../../types';

const formatDate = (value: string) => new Date(value).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const duration = (from: string, to: string) => {
  const minutes = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  return minutes < 60 ? `${minutes} daq` : `${Math.floor(minutes / 60)} soat ${minutes % 60} daq`;
};

export default function AdminResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'result', id], queryFn: () => api<ResultDetail>(`/admin/results/${id}`) });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;
  const r = data!;
  const passed = r.percentage >= r.passPercentage;
  const color = r.percentage >= 80 ? 'from-emerald-500 to-teal-500' : r.percentage >= 50 ? 'from-amber-400 to-orange-500' : 'from-rose-500 to-pink-500';
  const unanswered = r.answers.filter(a => !a.selectedOptionId).length;

  return <div className="mx-auto max-w-4xl">
    <Link href="/admin/results" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-600"><Icon name="arrow" className="h-4 w-4 rotate-180" />Natijalarga qaytish</Link>

    <section className="card mb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{r.test?.topic.name ?? 'Shaxsiy mashq'}</p>
          <h1 className="page-title">{r.test?.title ?? 'Shaxsiy mashq'}</h1>
          <p className="mt-2 text-sm text-slate-600"><b className="text-slate-900">{r.user.firstName} {r.user.lastName}</b> · {r.user.email}</p>
          <p className="mt-1 text-xs text-slate-400">{formatDate(r.finishedAt)} · davomiyligi {duration(r.startedAt, r.finishedAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2"><DifficultyBadge value={r.difficulty} /><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{passed ? 'O‘tdi' : 'Yiqildi'}</span></div>
      </div>
      <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span className="text-slate-500">Natija</span><b className="text-slate-900">{r.percentage}%</b></div><ProgressBar value={r.percentage} color={color} /></div>
    </section>

    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <StatCard label="To‘g‘ri javoblar" value={`${r.correctAnswers} / ${r.totalQuestions}`} icon="check" tone="emerald" />
      <StatCard label="Xato / javobsiz" value={`${r.wrongAnswers}`} icon="close" tone="amber" detail={unanswered ? `${unanswered} tasi javobsiz qoldirilgan` : undefined} />
      <StatCard label="To‘plangan ball" value={r.score} icon="trophy" tone="sky" />
    </div>

    <h2 className="mb-3 text-lg font-bold text-slate-900">Savollar bo‘yicha javoblar</h2>
    {!r.answers.length ? <p className="text-sm text-slate-500">Bu urinish uchun javoblar saqlanmagan.</p> : <ol className="space-y-3">{r.answers.map((answer, index) => <li key={answer.questionId} className={`card border-l-4 p-4 ${answer.isCorrect ? 'border-l-emerald-400' : 'border-l-rose-400'}`}>
      <div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-900"><span className="mr-2 text-slate-400">{index + 1}.</span>{answer.text}</p><span className={`shrink-0 text-xs font-bold ${answer.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{answer.earned} / {answer.points} ball</span></div>
      <ul className="mt-3 space-y-1.5">{answer.options.map(option => { const chosen = option.id === answer.selectedOptionId; const style = option.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : chosen ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-100 text-slate-600'; return <li key={option.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${style}`}><span>{option.text}</span><span className="shrink-0 text-xs font-bold">{chosen && option.isCorrect ? 'Talaba tanlagan · to‘g‘ri' : chosen ? 'Talaba tanlagan' : option.isCorrect ? 'To‘g‘ri javob' : ''}</span></li>; })}</ul>
      {!answer.selectedOptionId && <p className="mt-2 text-xs font-semibold text-amber-600">Javob berilmagan</p>}
    </li>)}</ol>}
  </div>;
}
