'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon, IconName } from '../../components/icons';
import { ErrorBox, Loading, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { sessionUser } from '../../lib/auth';

export default function AdminDashboard() {
  // Role is read after mount (localStorage); the hero text stays blank until known so there is no flash of the wrong wording.
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => { setRole(sessionUser()?.role ?? null); }, []);
  const teacher = role === 'TEACHER';
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<{ users: number; tests: number; questions: number; attempts: number }>('/admin') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;

  type Card = { href: string; icon: IconName; title: string; text: string; tone: string };
  const cards: Card[] = [
    { href: '/admin/users', icon: 'users', title: 'Foydalanuvchilar', text: 'Akkauntlar va o‘quv darajalarini ko‘ring.', tone: 'bg-sky-100 text-sky-600' },
    { href: '/admin/topics', icon: 'topics', title: 'Mavzular', text: 'O‘quv yo‘nalishlarini qo‘shing va boshqaring.', tone: 'bg-amber-100 text-amber-600' },
    { href: '/admin/tests', icon: 'tests', title: 'Testlar', text: 'Testlar, savollar va javob variantlarini tahrirlang.', tone: 'bg-violet-100 text-violet-600' },
    { href: '/admin/chat', icon: 'chat', title: 'Chat', text: 'Talabalar bilan xabar almashing.', tone: 'bg-emerald-100 text-emerald-600' },
  ].filter(item => item.href === '/admin/users' ? role === 'ADMIN' : item.href === '/admin/chat' ? teacher : true);

  return <>
    <section className="relative mb-7 overflow-hidden rounded-[28px] bg-gradient-to-r from-sky-600 to-indigo-700 px-6 py-8 text-white shadow-xl shadow-indigo-900/15 sm:px-9"><div className="soft-grid absolute inset-0 opacity-15" /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100"><Icon name="shield" className="h-4 w-4" />Boshqaruv markazi</span><h1 className="mt-4 min-h-[2.5rem] text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{role === null ? '' : teacher ? 'O‘qituvchi paneli' : 'Administrator paneli'}</h1><p className="mt-2 min-h-[3rem] max-w-2xl text-sm leading-6 text-sky-100">{role === null ? '' : teacher ? 'Mavzular, testlar va talabalar bilan muloqotni bir joydan boshqaring.' : 'Platformadagi foydalanuvchilar, mavzular va test kontentini bir joydan boshqaring.'}</p></div><Link href="/admin/tests/create" className="btn bg-white text-indigo-700 shadow-xl hover:-translate-y-0.5 hover:bg-sky-50"><Icon name="plus" className="h-4 w-4" />Yangi test</Link></div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Foydalanuvchilar" value={data!.users} icon="users" tone="sky" /><StatCard label="Testlar" value={data!.tests} icon="tests" /><StatCard label="Savollar" value={data!.questions} icon="question" tone="amber" /><StatCard label="Topshirilgan testlar" value={data!.attempts} icon="progress" tone="emerald" /></div>
    <section className="mt-8"><p className="eyebrow mb-2">Tezkor amallar</p><h2 className="text-xl font-bold text-slate-950">Kontentni boshqarish</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{cards.map(item => <Link href={item.href} key={item.href} className="card-interactive group"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${item.tone}`}><Icon name={item.icon} /></span><Icon name="arrow" className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" /></div><h3 className="mt-5 font-bold text-slate-900">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{item.text}</p></Link>)}</div></section>
  </>;
}
