'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useRef, useState } from 'react';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader, difficultyLabel } from '../../../components/ui';
import { api } from '../../../lib/api';
import { Difficulty, Topic, Video } from '../../../types';

const MAX_BYTES = 200 * 1024 * 1024;
const EXTENSIONS = ['.mp4', '.webm'];
type Form = { topicId: string; title: string; description: string; difficulty: '' | Difficulty; type: 'YOUTUBE' | 'UPLOAD'; youtubeUrl: string; isActive: boolean };
const emptyForm: Form = { topicId: '', title: '', description: '', difficulty: '', type: 'YOUTUBE', youtubeUrl: '', isActive: true };

export default function AdminVideosPage() {
  const queryClient = useQueryClient(); const fileInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState(''); const [form, setForm] = useState<Form>(emptyForm); const [editing, setEditing] = useState<Video | null>(null); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState('');
  const [pending, setPending] = useState<Video | null>(null);
  const topics = useQuery({ queryKey: ['admin', 'topics'], queryFn: () => api<Topic[]>('/admin/topics') });
  const videos = useQuery({ queryKey: ['admin', 'videos', filter], queryFn: () => api<Video[]>(`/admin/videos${filter ? `?topicId=${filter}` : ''}`) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'videos'] });
  const reset = () => { setForm(emptyForm); setEditing(null); setFile(null); setError(''); if (fileInput.current) fileInput.current.value = ''; };
  const save = useMutation({
    mutationFn: () => { const body = new FormData(); body.set('topicId', form.topicId); body.set('title', form.title); body.set('description', form.description); body.set('difficulty', form.difficulty); body.set('type', form.type); if (form.type === 'YOUTUBE') body.set('youtubeUrl', form.youtubeUrl); if (form.type === 'UPLOAD' && file) body.set('file', file); if (editing) body.set('isActive', String(form.isActive)); return api<Video>(editing ? `/admin/videos/${editing.id}` : '/admin/videos', { method: editing ? 'PATCH' : 'POST', body }); },
    onSuccess: () => { reset(); refresh(); }, onError: caught => setError((caught as Error).message),
  });
  const remove = useMutation({ mutationFn: (id: string) => api(`/admin/videos/${id}`, { method: 'DELETE' }), onSuccess: refresh });
  const choose = (picked: File | null) => {
    setError('');
    if (picked && (!EXTENSIONS.some(ext => picked.name.toLowerCase().endsWith(ext)) || picked.size > MAX_BYTES)) { setError(picked.size > MAX_BYTES ? 'Fayl hajmi 200 MB dan oshmasligi kerak' : 'Faqat mp4 yoki webm formatdagi video yuklash mumkin'); setFile(null); if (fileInput.current) fileInput.current.value = ''; return; }
    setFile(picked);
  };
  const startEdit = (video: Video) => { setEditing(video); setFile(null); setError(''); setForm({ topicId: video.topicId, title: video.title, description: video.description ?? '', difficulty: video.difficulty ?? '', type: video.type, youtubeUrl: video.youtubeId ? `https://youtu.be/${video.youtubeId}` : '', isActive: video.isActive }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); if (form.type === 'UPLOAD' && !file && editing?.type !== 'UPLOAD') { setError('Video faylni tanlang'); return; } save.mutate(); };
  if (topics.isLoading || videos.isLoading) return <Loading />;
  if (topics.error || videos.error) return <ErrorBox message={(topics.error ?? videos.error)!.message} />;
  const list = videos.data ?? [];
  const kind = (video: Video) => video.type === 'YOUTUBE' ? 'YouTube' : 'Fayl';

  return <><PageHeader eyebrow="Kontent" title="Videodarslar" description="Mavzularga YouTube havolasi yoki yuklangan video qo‘shing. O‘quvchilarga zaif mavzulariga mos videolar tavsiya qilinadi." />
    <form className="card mb-6" onSubmit={submit}>
      <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600"><Icon name={editing ? 'video' : 'plus'} /></span><div><h2 className="font-bold text-slate-900">{editing ? 'Videoni tahrirlash' : 'Yangi video'}</h2><p className="text-xs text-slate-400">{editing ? `«${editing.title}»` : 'YouTube havolasi yoki mp4/webm fayl (200 MB gacha)'}</p></div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="label" htmlFor="video-topic">Mavzu</label><select id="video-topic" className="input" value={form.topicId} onChange={e => setForm({ ...form, topicId: e.target.value })} required><option value="">Mavzuni tanlang</option>{topics.data?.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></div>
        <div><label className="label" htmlFor="video-title">Sarlavha</label><input id="video-title" className="input" maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="video-description">Qisqa tavsif</label><textarea id="video-description" className="input" maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="label" htmlFor="video-difficulty">Daraja</label><select id="video-difficulty" className="input" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as Form['difficulty'] })}><option value="">Ixtiyoriy</option>{(Object.keys(difficultyLabel) as Difficulty[]).map(level => <option key={level} value={level}>{difficultyLabel[level]}</option>)}</select></div>
        <fieldset><legend className="label">Manba</legend><div className="mt-2 flex gap-2">{(['YOUTUBE', 'UPLOAD'] as const).map(type => <label key={type} className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${form.type === type ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}><input className="sr-only" type="radio" name="video-type" checked={form.type === type} onChange={() => { setForm({ ...form, type }); setError(''); }} />{type === 'YOUTUBE' ? 'YouTube havolasi' : 'Fayl yuklash'}</label>)}</div></fieldset>
        {form.type === 'YOUTUBE'
          ? <div key="youtube-source" className="md:col-span-2"><label className="label" htmlFor="video-url">YouTube havolasi</label><input id="video-url" className="input" type="url" placeholder="https://www.youtube.com/watch?v=…" value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })} required /></div>
          : <div key="upload-source" className="md:col-span-2"><label className="label" htmlFor="video-file">Video fayl (mp4 yoki webm, 200 MB gacha)</label><input id="video-file" ref={fileInput} className="input" type="file" accept=".mp4,.webm,video/mp4,video/webm" onChange={e => choose(e.target.files?.[0] ?? null)} />{editing?.type === 'UPLOAD' && <p className="mt-1 text-xs text-slate-400">Yangi fayl tanlamasangiz, hozirgi fayl saqlanadi.</p>}</div>}
        {editing && <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />Faol (o‘quvchilarga ko‘rinadi)</label>}
      </div>
      {error && <div className="mt-4"><ErrorBox message={error} /></div>}
      <div className="mt-5 flex flex-wrap gap-3"><button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saqlanmoqda…' : editing ? 'Saqlash' : <><Icon name="plus" className="h-4 w-4" />Video qo‘shish</>}</button>{editing && <button type="button" className="btn-secondary" onClick={reset}>Bekor qilish</button>}</div>
    </form>

    <div className="mb-4 flex items-center gap-3"><label className="label" htmlFor="video-filter">Mavzu bo‘yicha</label><select id="video-filter" className="input mt-0 max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Barchasi</option>{topics.data?.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></div>
    {!list.length ? <EmptyState title="Videolar mavjud emas" description="Birinchi videodarsni yuqoridagi forma orqali qo‘shing." icon="book" /> : <>
      <div className="grid gap-3 md:hidden">{list.map(video => <article key={video.id} className="card p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600"><Icon name="video" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{video.title}</h2><p className="mt-1 text-xs text-slate-500">{video.topic.name} · {kind(video)}{!video.isActive && ' · nofaol'}</p>{video.difficulty && <div className="mt-2"><DifficultyBadge value={video.difficulty} /></div>}</div><div className="flex gap-2"><button className="text-slate-400 hover:text-violet-600" onClick={() => startEdit(video)} aria-label="Tahrirlash"><Icon name="arrow" className="h-5 w-5" /></button><button className="text-rose-500" onClick={() => setPending(video)} aria-label="Videoni o‘chirish"><Icon name="close" className="h-5 w-5" /></button></div></div></article>)}</div>
      <div className="table-shell hidden overflow-x-auto md:block"><table className="data-table"><thead><tr><th>Sarlavha</th><th>Mavzu</th><th>Manba</th><th>Daraja</th><th>Holat</th><th /></tr></thead><tbody>{list.map(video => <tr key={video.id}><td><b className="text-slate-900">{video.title}</b></td><td>{video.topic.name}</td><td>{kind(video)}</td><td>{video.difficulty ? <DifficultyBadge value={video.difficulty} /> : '—'}</td><td>{video.isActive ? 'Faol' : 'Nofaol'}</td><td className="text-right"><div className="flex justify-end gap-2"><button className="btn-secondary min-h-9 px-3 py-1.5" onClick={() => startEdit(video)}>Tahrirlash</button><button className="btn-danger min-h-9 px-3 py-1.5" onClick={() => setPending(video)}><Icon name="close" className="h-4 w-4" />O‘chirish</button></div></td></tr>)}</tbody></table></div></>}
    <ConfirmDialog open={!!pending} destructive title="Videoni o‘chirasizmi?" description={`“${pending?.title}” videosi o‘chiriladi${pending?.type === 'UPLOAD' ? ' va yuklangan fayl serverdan olib tashlanadi' : ''}. Bu amalni qaytarib bo‘lmaydi.`} confirmLabel="O‘chirish" cancelLabel="Bekor qilish" busy={remove.isPending} busyLabel="O‘chirilmoqda…" error={remove.error?.message} onConfirm={() => remove.mutate(pending!.id, { onSuccess: () => setPending(null) })} onCancel={() => { remove.reset(); setPending(null); }} />
  </>;
}
