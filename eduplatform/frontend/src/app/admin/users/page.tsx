'use client';

import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader } from '../../../components/ui';
import { api } from '../../../lib/api';
import { User } from '../../../types';

export default function UsersPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api<{ items: User[]; meta: { total: number } }>('/admin/users') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;

  return <><PageHeader eyebrow="Auditoriya" title="Foydalanuvchilar" description={`${data!.meta.total} ta ro‘yxatdan o‘tgan foydalanuvchi va ularning joriy o‘quv darajasi.`} />
    {!data!.items.length ? <EmptyState title="Foydalanuvchilar yo‘q" description="Yangi foydalanuvchilar ro‘yxatdan o‘tgach shu yerda paydo bo‘ladi." icon="users" /> : <><div className="grid gap-3 md:hidden">{data!.items.map(user => { const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(); return <article className="card flex items-center gap-3 p-4" key={user.id}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700">{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user.firstName} {user.lastName}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div><DifficultyBadge value={user.currentDifficulty} /></article>; })}</div>
    <div className="table-shell hidden overflow-x-auto md:block"><table className="data-table min-w-[760px]"><thead><tr><th>Foydalanuvchi</th><th>Email</th><th>Rol</th><th>Daraja</th><th>Qo‘shilgan sana</th></tr></thead><tbody>{data!.items.map(user => { const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(); return <tr key={user.id}><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700">{initials}</span><b className="text-slate-900">{user.firstName} {user.lastName}</b></div></td><td>{user.email}</td><td><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}><Icon name={user.role === 'ADMIN' ? 'shield' : 'users'} className="h-3.5 w-3.5" />{user.role === 'ADMIN' ? 'Admin' : 'Talaba'}</span></td><td><DifficultyBadge value={user.currentDifficulty} /></td><td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '—'}</td></tr>; })}</tbody></table></div></>}
  </>;
}
