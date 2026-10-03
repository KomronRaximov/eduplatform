'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, sessionUser } from '../lib/auth';
import { User } from '../types';
import { Icon, IconName } from './icons';
import { Brand } from './ui';

const links: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/users', label: 'Foydalanuvchilar', icon: 'users' },
  { href: '/admin/topics', label: 'Mavzular', icon: 'topics' },
  { href: '/admin/tests', label: 'Testlar', icon: 'tests' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const current = sessionUser();
    if (!current) router.replace('/login');
    else if (current.role !== 'ADMIN') router.replace('/dashboard');
    else setUser(current);
  }, [router]);

  if (!user) return <div className="min-h-screen bg-slate-50" />;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const active = (href: string) => href === '/admin' ? pathname === href : pathname.startsWith(href);

  return <div className="min-h-screen bg-[#f7f8fc] md:grid md:grid-cols-[260px_1fr]">
    <aside className="relative hidden min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
      <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,.24),transparent_60%)]" />
      <Link href="/admin" className="relative px-3"><Brand /></Link>
      <div className="relative mx-3 mt-6 flex items-center gap-2 rounded-xl border border-sky-400/10 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-300"><Icon name="shield" className="h-4 w-4" />Administrator paneli</div>
      <p className="relative mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Boshqaruv</p>
      <nav className="relative space-y-1.5">{links.map(link => <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${active(link.href) ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/40' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}><Icon name={link.icon} className="h-[19px] w-[19px]" />{link.label}{active(link.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}</Link>)}</nav>
      <div className="relative mt-auto"><div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/20 text-sm font-bold text-sky-300">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p><p className="truncate text-xs text-slate-500">Administrator</p></div></div></div><button onClick={() => { logout(); router.push('/login'); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"><Icon name="logout" className="h-[19px] w-[19px]" />Chiqish</button></div>
    </aside>
    <div className="min-w-0"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl md:hidden"><Link href="/admin" className="text-slate-950"><Brand /></Link><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700">{initials}</span></header><main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-9 xl:px-10">{children}</main></div>
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/60 bg-slate-950/95 p-1.5 shadow-2xl shadow-slate-900/25 backdrop-blur md:hidden">{links.map(link => <Link key={link.href} href={link.href} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${active(link.href) ? 'bg-sky-600 text-white' : 'text-slate-400'}`}><Icon name={link.icon} className="h-[18px] w-[18px]" /><span className="truncate">{link.label}</span></Link>)}</nav>
  </div>;
}
