'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../../../components/icons';
import { api } from '../../../lib/api';
import { saveSession } from '../../../lib/auth';
import { User } from '../../../types';

export default function RegisterPage() {
  const router = useRouter();
  const [data, setData] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) => setData(current => ({ ...current, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (data.password !== data.confirm) return setError('Parollar bir-biriga mos emas');
    setBusy(true); setError('');
    try {
      const { confirm: _confirm, ...registration } = data;
      const result = await api<{ accessToken: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(registration) });
      saveSession(result.accessToken, result.user); router.replace('/dashboard');
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_24px_70px_rgba(30,41,59,.12)] backdrop-blur sm:p-9">
    <p className="eyebrow mb-2">Yangi akkaunt</p><h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">O‘rganishni boshlang</h1><p className="mt-2 text-sm leading-6 text-slate-500">Bir daqiqada ro‘yxatdan o‘ting va o‘zingizga mos testlarni ishlang.</p>
    {error && <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700"><Icon name="close" className="h-4 w-4" />{error}</div>}
    <form onSubmit={submit} className="mt-7">
      <div className="grid gap-4 sm:grid-cols-2"><label className="label">Ism<input className="input" value={data.firstName} onChange={change('firstName')} autoComplete="given-name" required /></label><label className="label">Familiya<input className="input" value={data.lastName} onChange={change('lastName')} autoComplete="family-name" required /></label></div>
      <label className="label mt-5 block">Email manzil<input className="input" type="email" value={data.email} onChange={change('email')} autoComplete="email" required /></label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="label">Parol<input className="input" type="password" minLength={8} value={data.password} onChange={change('password')} autoComplete="new-password" required /></label><label className="label">Parolni tasdiqlang<input className="input" type="password" minLength={8} value={data.confirm} onChange={change('confirm')} autoComplete="new-password" required /></label></div>
      <p className="mt-3 text-xs text-slate-400">Parol kamida 8 ta belgidan iborat bo‘lishi kerak.</p>
      <button disabled={busy} className="btn-primary mt-7 w-full">{busy ? 'Yaratilmoqda…' : <>Akkaunt yaratish<Icon name="arrow" className="h-4 w-4" /></>}</button>
    </form>
    <p className="mt-7 text-center text-sm text-slate-500">Akkauntingiz bormi? <Link className="font-bold text-violet-600 hover:text-violet-700" href="/login">Kirish</Link></p>
  </div>;
}
