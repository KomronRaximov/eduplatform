import { youtubeThumb } from '../lib/video';
import { Video } from '../types';
import { Icon } from './icons';
import { DifficultyBadge } from './ui';

export function VideoCard({ video, reason, aiBadge = false, onPlay }: { video: Video; reason?: string; aiBadge?: boolean; onPlay: () => void }) {
  return <article className="card-interactive flex flex-col overflow-hidden p-0">
    <button className="group relative block aspect-video w-full bg-slate-900 text-left" onClick={onPlay} aria-label={`${video.title} videosini ochish`}>
      {video.type === 'YOUTUBE' && video.youtubeId
        ? <img className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" src={youtubeThumb(video.youtubeId)} alt="" loading="lazy" />
        : <span className="grid h-full w-full place-items-center bg-gradient-to-br from-violet-600 to-indigo-700 text-white/80"><Icon name="video" className="h-10 w-10" /></span>}
      <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-violet-700 shadow-lg transition group-hover:scale-110"><Icon name="arrow" className="h-5 w-5" /></span></span>
      {aiBadge && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white"><Icon name="sparkles" className="h-3.5 w-3.5" />AI tavsiyasi</span>}
    </button>
    <div className="flex flex-1 flex-col p-4">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">{video.topic.name}</p>{video.difficulty && <DifficultyBadge value={video.difficulty} />}</div>
      <h3 className="mt-1.5 font-bold text-slate-900">{video.title}</h3>
      {reason ? <p className="mt-2 text-sm leading-6 text-slate-500">{reason}</p> : video.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{video.description}</p>}
    </div>
  </article>;
}
