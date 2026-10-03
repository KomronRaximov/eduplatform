'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '../../../../../components/icons';
import { DifficultyBadge, Loading } from '../../../../../components/ui';
import { VideoCard } from '../../../../../components/video-card';
import { VideoPlayerModal } from '../../../../../components/video-player';
import { api } from '../../../../../lib/api';
import { Attempt, Difficulty, Video } from '../../../../../types';

type Result = { attemptId: string; totalQuestions: number; correctAnswers: number; wrongAnswers: number; score: number; percentage: number; currentDifficulty: Difficulty; recommendedDifficulty: Difficulty; recommendation: string };

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => { const saved = sessionStorage.getItem(`result:${id}`); if (saved) setResult(JSON.parse(saved)); else api<Attempt>(`/attempts/${id}`).then(attempt => setResult({ attemptId: attempt.id, totalQuestions: attempt.totalQuestions, correctAnswers: attempt.correctAnswers, wrongAnswers: attempt.wrongAnswers, score: attempt.score, percentage: attempt.percentage, currentDifficulty: attempt.difficulty, recommendedDifficulty: attempt.recommendedDifficulty, recommendation: 'Natijangiz saqlandi. Keyingi tavsiya etilgan testni boshlashingiz mumkin.' })); }, [id]);
  const attempt = useQuery({ queryKey: ['attempt', id], queryFn: () => api<Attempt>(`/attempts/${id}`) });
  const topicId = attempt.data?.test?.topic.id;
  const videos = useQuery({ queryKey: ['videos', topicId], queryFn: () => api<Video[]>(`/videos?topicId=${topicId}`), enabled: !!topicId, retry: false });
  const [playing, setPlaying] = useState<Video | null>(null);
  if (!result) return <Loading />;
  const tone = result.percentage >= 80 ? 'from-emerald-500 to-teal-600' : result.percentage >= 50 ? 'from-amber-400 to-orange-500' : 'from-rose-500 to-pink-600';

  return <div className="mx-auto max-w-3xl">
    <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/15 sm:p-10">
      <div className={`absolute -right-28 -top-28 h-72 w-72 rounded-full bg-gradient-to-br ${tone} opacity-30 blur-2xl`} /><div className="soft-grid absolute inset-0 opacity-10" />
      <div className="relative text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-emerald-300"><Icon name="trophy" className="h-7 w-7" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Test yakunlandi</p><h1 className="mt-3 text-6xl font-bold tracking-[-0.06em] sm:text-7xl">{result.percentage}<span className="text-3xl text-slate-400">%</span></h1><p className="mt-2 text-sm text-slate-400">Umumiy natijangiz</p>
        <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 sm:gap-4">{[[result.correctAnswers, 'To‘g‘ri', 'check'], [result.wrongAnswers, 'Noto‘g‘ri', 'close'], [result.score, 'Ball', 'target']].map(([value, label, icon]) => <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:p-4" key={String(label)}><Icon name={icon as 'check'|'close'|'target'} className="mx-auto h-5 w-5 text-violet-300" /><b className="mt-2 block text-2xl">{value}</b><span className="text-[11px] text-slate-400 sm:text-xs">{label}</span></div>)}</div>
      </div>
    </section>
    <section className="card relative -mt-3 rounded-t-[26px] sm:mx-5"><div className="grid gap-6 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Joriy daraja</p><DifficultyBadge value={result.currentDifficulty} /></div><div className="rounded-2xl bg-violet-50 p-4 text-center"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">Keyingi tavsiya</p><DifficultyBadge value={result.recommendedDifficulty} /></div></div><div className="mt-5 flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-violet-900"><Icon name="sparkles" className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" /><p>{result.recommendation}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link className="btn-primary" href="/tests">Keyingi test<Icon name="arrow" className="h-4 w-4" /></Link><Link className="btn-secondary" href="/dashboard">Bosh sahifaga qaytish</Link></div></section>
    {!!videos.data?.length && <section className="mt-7"><div className="mb-4"><p className="eyebrow mb-1.5">Mavzuni mustahkamlang</p><h2 className="text-xl font-bold tracking-tight text-slate-950">Shu mavzu bo‘yicha videodarslar</h2></div><div className="grid gap-4 sm:grid-cols-2">{videos.data.slice(0, 4).map(video => <VideoCard key={video.id} video={video} onPlay={() => setPlaying(video)} />)}</div></section>}
    <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
  </div>;
}
