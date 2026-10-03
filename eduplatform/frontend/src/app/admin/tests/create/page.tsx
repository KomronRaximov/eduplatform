'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Icon } from '../../../../components/icons';
import { ErrorBox, Loading, PageHeader, difficultyLabel } from '../../../../components/ui';
import { api } from '../../../../lib/api';
import { Difficulty, Test, Topic } from '../../../../types';

export default function CreateTestPage() {
  const router = useRouter(); const { data: topics, isLoading } = useQuery({ queryKey: ['admin', 'topics'], queryFn: () => api<Topic[]>('/admin/topics') });
  const [form, setForm] = useState({ title: '', description: '', topicId: '', difficulty: 'EASY' as Difficulty, durationMinutes: '20' }); const [error, setError] = useState('');
  const create = useMutation({ mutationFn: () => api<Test>('/admin/tests', { method: 'POST', body: JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes), isActive: true }) }), onSuccess: test => router.push(`/admin/tests/${test.id}/edit`), onError: caught => setError((caught as Error).message) });
  if (isLoading) return <Loading />;
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(current => ({ ...current, [key]: event.target.value }));

  return <><PageHeader eyebrow="Yangi kontent" title="Test yaratish" description="Asosiy ma’lumotlarni kiriting. Keyingi bosqichda savol va javob variantlarini qo‘shasiz." action={<Link href="/admin/tests" className="btn-secondary">Bekor qilish</Link>} />
    {error && <div className="mb-5"><ErrorBox message={error} /></div>}
    <form className="card max-w-3xl" onSubmit={(event: FormEvent) => { event.preventDefault(); create.mutate(); }}><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Icon name="tests" /></span><div><h2 className="font-bold">Test ma’lumotlari</h2><p className="text-xs text-slate-400">Barcha maydonlarni aniq to‘ldiring</p></div></div><div className="mt-6 space-y-5"><label className="label block">Test nomi<input className="input" value={form.title} onChange={set('title')} placeholder="Masalan: Algebra asoslari" required /></label><label className="label block">Qisqa tavsif<textarea className="input" value={form.description} onChange={set('description')} placeholder="Test qaysi bilimlarni tekshiradi?" /></label><div className="grid gap-4 sm:grid-cols-3"><label className="label">Mavzu<select className="input" value={form.topicId} onChange={set('topicId')} required><option value="">Tanlang</option>{topics?.map(topic => <option value={topic.id} key={topic.id}>{topic.name}</option>)}</select></label><label className="label">Daraja<select className="input" value={form.difficulty} onChange={set('difficulty')}>{(['EASY','MEDIUM','HARD'] as Difficulty[]).map(value => <option key={value} value={value}>{difficultyLabel[value]}</option>)}</select></label><label className="label">Davomiyligi (daq.)<input className="input" type="number" min="1" value={form.durationMinutes} onChange={set('durationMinutes')} /></label></div></div><div className="mt-7 flex justify-end"><button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Saqlanmoqda…' : <>Saqlash va savol qo‘shish<Icon name="arrow" className="h-4 w-4" /></>}</button></div></form>
  </>;
}
