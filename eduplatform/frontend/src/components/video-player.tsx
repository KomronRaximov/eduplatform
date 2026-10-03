'use client';

import { useEffect } from 'react';
import { videoFileSrc, youtubeEmbedUrl } from '../lib/video';
import { Video } from '../types';
import { Icon } from './icons';

export function VideoPlayerModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [video, onClose]);
  if (!video) return null;

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={video.title} className="w-full max-w-3xl overflow-hidden rounded-[26px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="aspect-video bg-black">
        {video.type === 'YOUTUBE' && video.youtubeId
          ? <iframe className="h-full w-full" src={youtubeEmbedUrl(video.youtubeId)} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          : video.fileUrl && <video className="h-full w-full" src={videoFileSrc(video.fileUrl)} controls autoPlay preload="metadata" />}
      </div>
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">{video.topic.name}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{video.title}</h2>{video.description && <p className="mt-2 text-sm leading-6 text-slate-500">{video.description}</p>}</div>
        <button className="btn-secondary shrink-0" onClick={onClose} aria-label="Yopish"><Icon name="close" className="h-4 w-4" />Yopish</button>
      </div>
    </div>
  </div>;
}
