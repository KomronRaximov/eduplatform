'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, sessionUser } from '../lib/auth';
import { useChatRealtime, useUnreadCount } from '../lib/chat';
import { User } from '../types';
import { Icon, IconName } from './icons';
import { Brand } from './ui';
import { UnreadBadge } from './unread-badge';

const links: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: 'dashboard' },
  { href: '/tests', label: 'Testlar', icon: 'tests' },
  { href: '/history', label: 'Natijalar', icon: 'history' },
  { href: '/progress', label: 'Progress', icon: 'progress' },
  { href: '/chat', label: 'Chat', icon: 'chat' },
];

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const current = sessionUser();
    if (!current) router.replace('/login');
    else if (current.role === 'ADMIN' || current.role === 'TEACHER') router.replace('/admin');
    else setUser(current);
  }, [router]);
  useChatRealtime();
  const unread = useUnreadCount();

  if (!user) return <div className="min-h-screen bg-slate-50" />;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const active = (href: string) => pathname === href || ((href === '/tests' || href === '/chat') && pathname.startsWith(`${href}/`));

  return <div className="min-h-screen bg-[#f7f8fc] md:grid md:grid-cols-[260px_1fr]">
    <aside className="relative hidden min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
      <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.35),transparent_60%)]" />
      <Link href="/dashboard" className="relative px-3"><Brand /></Link>
      <p className="relative mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Asosiy menyu</p>
      <nav className="relative space-y-1.5">{links.map(link => <Link key={link.href} href={link.href} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${active(link.href) ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/40' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}><Icon name={link.icon} className="h-[19px] w-[19px]" />{link.label}{link.href === '/chat' && <UnreadBadge count={unread} className="ml-auto" />}{active(link.href) && <span className={`h-1.5 w-1.5 rounded-full bg-white ${link.href === '/chat' && unread > 0 ? 'ml-1' : 'ml-auto'}`} />}</Link>)}</nav>
      <div className="relative mt-auto">
        <div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/20 text-sm font-bold text-violet-300">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div></div>
        <button onClick={() => { logout(); router.push('/login'); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"><Icon name="logout" className="h-[19px] w-[19px]" />Chiqish</button>
      </div>
    </aside>

    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl md:hidden"><Link href="/dashboard" className="text-slate-950"><Brand /></Link><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-xs font-bold text-violet-700">{initials}</span></header>
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-9 xl:px-10">{children}</main>
    </div>

    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/60 bg-slate-950/95 p-1.5 shadow-2xl shadow-slate-900/25 backdrop-blur md:hidden">{links.map(link => <Link key={link.href} href={link.href} className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${active(link.href) ? 'bg-violet-600 text-white' : 'text-slate-400'}`}><Icon name={link.icon} className="h-[18px] w-[18px]" />{link.href === '/chat' && <UnreadBadge count={unread} className="absolute right-1.5 top-0.5" />}<span className="truncate">{link.label}</span></Link>)}</nav>
  </div>;
}
