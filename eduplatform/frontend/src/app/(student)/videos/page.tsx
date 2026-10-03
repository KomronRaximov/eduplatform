'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, ErrorBox, Loading, PageHeader } from '../../../components/ui';
import { VideoCard } from '../../../components/video-card';
import { VideoPlayerModal } from '../../../components/video-player';
import { api } from '../../../lib/api';
import { Video } from '../../../types';

export default function VideosPage() {
  const [playing, setPlaying] = useState<Video | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['videos'], queryFn: () => api<Video[]>('/videos') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;
  const groups = new Map<string, { name: string; videos: Video[] }>();
  for (const video of data ?? []) { const group = groups.get(video.topicId) ?? { name: video.topic.name, videos: [] }; group.videos.push(video); groups.set(video.topicId, group); }

  return <>
    <PageHeader eyebrow="O‘rganish" title="Videodarslar" description="Mavzular bo‘yicha tayyor videodarslar. Zaif mavzularingizni mustahkamlash uchun foydalaning." />
    {!groups.size ? <EmptyState title="Videodarslar hali qo‘shilmagan" description="Administrator videolarni qo‘shgach, ular shu yerda ko‘rinadi." icon="book" /> : Array.from(groups.entries()).map(([topicId, group]) => <section key={topicId} className="mb-9"><h2 className="mb-4 text-xl font-bold tracking-tight text-slate-950">{group.name}</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.videos.map(video => <VideoCard key={video.id} video={video} onPlay={() => setPlaying(video)} />)}</div></section>)}
    <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
  </>;
}
