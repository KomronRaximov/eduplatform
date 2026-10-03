'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader, difficultyLabel } from '../../../components/ui';
import { api } from '../../../lib/api';
import { Difficulty, Test, Topic } from '../../../types';

export default function TestsPage() {
  const [difficulty, setDifficulty] = useState('');
  const [topicId, setTopicId] = useState('');
  const { data: topics = [] } = useQuery({ queryKey: ['topics'], queryFn: () => api<Topic[]>('/topics') });
  const { data, isLoading, error } = useQuery({ queryKey: ['tests', difficulty, topicId], queryFn: () => api<Test[]>(`/tests?${new URLSearchParams({ ...(difficulty && { difficulty }), ...(topicId && { topicId }) })}`) });

  return <>
    <PageHeader eyebrow="Test kutubxonasi" title="Bilimingizni sinab ko‘ring" description="Mavzu va qiyinlik darajasini tanlang. Har bir natija keyingi tavsiyangizni aniqroq qiladi." />
    <div className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Icon name="tests" className="h-5 w-5" /></div><div className="grid flex-1 gap-3 sm:grid-cols-2"><label className="sr-only" htmlFor="topic">Mavzu</label><select id="topic" className="input mt-0" value={topicId} onChange={e => setTopicId(e.target.value)}><option value="">Barcha mavzular</option>{topics.map(topic => <option value={topic.id} key={topic.id}>{topic.name}</option>)}</select><label className="sr-only" htmlFor="difficulty">Daraja</label><select id="difficulty" className="input mt-0" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="">Barcha darajalar</option>{(['EASY','MEDIUM','HARD'] as Difficulty[]).map(value => <option key={value} value={value}>{difficultyLabel[value]}</option>)}</select></div>{(difficulty || topicId) && <button className="btn-secondary" onClick={() => { setDifficulty(''); setTopicId(''); }}>Tozalash</button>}</div>
    {isLoading ? <Loading /> : error ? <ErrorBox message={error.message} /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data?.map(test => <article className="card-interactive group flex flex-col" key={test.id}><div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600"><Icon name="book" className="h-6 w-6" /></span><DifficultyBadge value={test.difficulty} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-violet-600">{test.topic.name}</p><h2 className="mt-2 text-lg font-bold text-slate-950">{test.title}</h2><p className="mt-2 line-clamp-2 min-h-12 flex-1 text-sm leading-6 text-slate-500">{test.description || 'Ushbu test orqali mavzu bo‘yicha bilimingizni tekshiring.'}</p><div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500"><span className="flex items-center gap-1.5"><Icon name="question" className="h-4 w-4" />{test._count?.questions ?? 0} savol</span><span className="flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4" />{test.durationMinutes ?? '—'} daqiqa</span></div><Link className="btn-primary mt-5 w-full" href={`/tests/${test.id}`}>Testni boshlash<Icon name="arrow" className="h-4 w-4" /></Link></article>)}{!data?.length && <EmptyState title="Test topilmadi" description="Tanlangan filtrlar bo‘yicha test mavjud emas. Filtrlarni o‘zgartirib ko‘ring." icon="tests" />}</div>}
  </>;
}
