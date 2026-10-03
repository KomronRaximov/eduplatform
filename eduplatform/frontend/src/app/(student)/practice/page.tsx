'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/icons';
import { EmptyState, ErrorBox, Loading, ProgressBar } from '../../../components/ui';
import { api } from '../../../lib/api';
import { formatReview } from '../../../lib/practice';

type Question = { id: string; text: string; order: number; points: number; options: { id: string; text: string; order: number }[] };
type Start = { attemptId: string | null; questions: Question[] };
type Result = { attemptId: string; totalQuestions: number; correctAnswers: number; wrongAnswers: number; percentage: number; results: { questionId: string; isCorrect: boolean; nextReviewAt: string }[] };

export default function PracticePage() {
  const started = useRef(false);
  const [start, setStart] = useState<Start | null>(null); const [error, setError] = useState(''); const [index, setIndex] = useState(0); const [answers, setAnswers] = useState<Record<string, string>>({}); const [result, setResult] = useState<Result | null>(null);
  useEffect(() => { if (started.current) return; started.current = true; api<Start>('/practice/start', { method: 'POST' }).then(setStart).catch(caught => setError(caught.message)); }, []);
  const submit = useMutation({ mutationFn: () => api<Result>(`/practice/${start!.attemptId}/submit`, { method: 'POST', body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })) }) }), onSuccess: setResult, onError: caught => setError((caught as Error).message) });
  if (error && !start) return <ErrorBox message={error} />; if (!start) return <Loading />;
  if (!start.attemptId || !start.questions.length) return <EmptyState title="Hozircha mashq uchun savol yo‘q" description="Barcha savollar o‘zlashtirilgan yoki takrorlash vaqti hali kelmagan. Keyinroq qaytib keling yoki test yeching." icon="book" action={{ href: '/tests', label: 'Testlarni ko‘rish' }} />;

  if (result) {
    const byId = new Map(start.questions.map(question => [question.id, question]));
    return <div className="mx-auto max-w-3xl">
      <section className="card text-center"><p className="eyebrow mb-2">Mashq yakunlandi</p><h1 className="text-5xl font-bold tracking-tight text-slate-950">{result.percentage}<span className="text-2xl text-slate-400">%</span></h1><p className="mt-2 text-sm text-slate-500">{result.correctAnswers} ta to‘g‘ri, {result.wrongAnswers} ta noto‘g‘ri</p></section>
      <section className="mt-5 grid gap-3">{result.results.map(item => <div key={item.questionId} className="card flex items-center gap-4 p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}><Icon name={item.isCorrect ? 'check' : 'close'} className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{byId.get(item.questionId)?.text}</p><p className="mt-1 text-xs text-slate-400">Keyingi takrorlash: {formatReview(item.nextReviewAt)}</p></div></div>)}</section>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="btn-primary" onClick={() => window.location.reload()}>Yana mashq qilish<Icon name="arrow" className="h-4 w-4" /></button><Link className="btn-secondary" href="/dashboard">Bosh sahifaga qaytish</Link></div>
    </div>;
  }

  const question = start.questions[index]; const answered = Object.keys(answers).length;
  return <div className="mx-auto max-w-4xl">
    <header className="mb-6"><span className="text-xs font-semibold text-slate-400">Shaxsiy mashq · {answered}/{start.questions.length} javob berildi</span><div className="mt-4"><div className="mb-2 flex justify-between text-xs font-semibold text-slate-400"><span>Savol {index + 1} / {start.questions.length}</span><span>{Math.round(((index + 1) / start.questions.length) * 100)}%</span></div><ProgressBar value={((index + 1) / start.questions.length) * 100} /></div></header>
    {error && <div className="mb-4"><ErrorBox message={error} /></div>}
    <section className="card p-5 sm:p-8"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 font-bold text-violet-700">{index + 1}</span><h2 className="mt-1.5 text-lg font-bold leading-7 text-slate-950 sm:text-xl">{question.text}</h2></div><div className="mt-7 grid gap-3">{question.options.map((option, optionIndex) => { const selected = answers[question.id] === option.id; return <label key={option.id} className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition sm:p-5 ${selected ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40'}`}><input className="sr-only" type="radio" name={question.id} checked={selected} onChange={() => setAnswers(current => ({ ...current, [question.id]: option.id }))} /><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600'}`}>{String.fromCharCode(65 + optionIndex)}</span><span className={`text-sm leading-6 sm:text-base ${selected ? 'font-semibold text-violet-950' : 'text-slate-700'}`}>{option.text}</span>{selected && <Icon name="check" className="ml-auto h-5 w-5 shrink-0 text-violet-600" />}</label>; })}</div></section>
    <footer className="mt-5 flex items-center justify-between gap-3"><button className="btn-secondary" disabled={!index} onClick={() => setIndex(current => current - 1)}>Oldingi</button>{index < start.questions.length - 1 ? <button className="btn-primary" onClick={() => setIndex(current => current + 1)}>Keyingi<Icon name="arrow" className="h-4 w-4" /></button> : <button className="btn-primary" disabled={submit.isPending} onClick={() => { if (confirm(`${answered}/${start.questions.length} savolga javob berdingiz. Mashqni yakunlaysizmi?`)) submit.mutate(); }}>{submit.isPending ? 'Hisoblanmoqda…' : <>Yakunlash<Icon name="check" className="h-4 w-4" /></>}</button>}</footer>
  </div>;
}
