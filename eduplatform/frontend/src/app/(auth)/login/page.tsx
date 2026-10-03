'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../../../components/icons';
import { api } from '../../../lib/api';
import { saveSession } from '../../../lib/auth';
import { User } from '../../../types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('student@example.com');
  const [password, setPassword] = useState('Student123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function useDemo(role: 'student' | 'admin') {
    setEmail(`${role}@example.com`);
    setPassword(role === 'admin' ? 'Admin123!' : 'Student123!');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      saveSession(result.accessToken, result.user);
      router.replace(result.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_24px_70px_rgba(30,41,59,.12)] backdrop-blur sm:p-9">
    <div><p className="eyebrow mb-2">Xush kelibsiz</p><h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">Akkauntingizga kiring</h1><p className="mt-2 text-sm leading-6 text-slate-500">O‘quv jarayonini davom ettirish uchun ma’lumotlaringizni kiriting.</p></div>
    {error && <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700"><Icon name="close" className="h-4 w-4" />{error}</div>}
    <form onSubmit={submit} className="mt-7">
      <label className="label block">Email manzil<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      <label className="label mt-5 block">Parol<input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kamida 8 ta belgi" autoComplete="current-password" required /></label>
      <button disabled={busy} className="btn-primary mt-7 w-full">{busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Kirilmoqda…</> : <>Kirish<Icon name="arrow" className="h-4 w-4" /></>}</button>
    </form>
    <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />Demo akkaunt<span className="h-px flex-1 bg-slate-200" /></div>
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => useDemo('student')} className="btn-secondary px-3"><Icon name="book" className="h-4 w-4" />Talaba</button><button type="button" onClick={() => useDemo('admin')} className="btn-secondary px-3"><Icon name="shield" className="h-4 w-4" />Admin</button></div>
    <p className="mt-7 text-center text-sm text-slate-500">Akkauntingiz yo‘qmi? <Link className="font-bold text-violet-600 hover:text-violet-700" href="/register">Ro‘yxatdan o‘ting</Link></p>
  </div>;
}
