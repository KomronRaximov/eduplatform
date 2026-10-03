'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader } from '../../../components/ui';
import { api } from '../../../lib/api';
import { sessionUser } from '../../../lib/auth';
import { Role, User } from '../../../types';

const roleOptions: { value: Role; label: string }[] = [{ value: 'STUDENT', label: 'Talaba' }, { value: 'TEACHER', label: 'O‘qituvchi' }, { value: 'ADMIN', label: 'Administrator' }];

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<User | null>(null);
  const [roleError, setRoleError] = useState('');
  useEffect(() => {
    const current = sessionUser();
    if (current && current.role !== 'ADMIN') router.replace('/admin');
    else setMe(current);
  }, [router]);
  const changeRole = useMutation({ mutationFn: ({ id, role }: { id: string; role: Role }) => api('/admin/users/' + id, { method: 'PATCH', body: JSON.stringify({ role }) }), onSuccess: () => { setRoleError(''); queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); }, onError: caught => setRoleError((caught as Error).message) });
  const roleSelect = (user: User) => <select className="input !mt-0 !w-auto !py-1.5 text-xs" aria-label={`${user.firstName} ${user.lastName} roli`} value={user.role} disabled={user.id === me?.id || changeRole.isPending} onChange={e => changeRole.mutate({ id: user.id, role: e.target.value as Role })}>{roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  const { data, isLoading, error } = useQuery({ enabled: me?.role === 'ADMIN', queryKey: ['admin', 'users'], queryFn: () => api<{ items: User[]; meta: { total: number } }>('/admin/users') });
  if (!me || me.role !== 'ADMIN' || isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;

  return <><PageHeader eyebrow="Auditoriya" title="Foydalanuvchilar" description={`${data!.meta.total} ta ro‘yxatdan o‘tgan foydalanuvchi va ularning joriy o‘quv darajasi.`} />
    <p className="mb-4 text-xs text-slate-500">Rol o‘zgargach foydalanuvchi qayta kirishi kerak.</p>
    {roleError && <ErrorBox message={roleError} />}
    {!data!.items.length ? <EmptyState title="Foydalanuvchilar yo‘q" description="Yangi foydalanuvchilar ro‘yxatdan o‘tgach shu yerda paydo bo‘ladi." icon="users" /> : <><div className="grid gap-3 md:hidden">{data!.items.map(user => { const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(); return <article className="card flex items-center gap-3 p-4" key={user.id}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700">{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user.firstName} {user.lastName}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div><div className="flex shrink-0 flex-col items-end gap-2">{roleSelect(user)}<DifficultyBadge value={user.currentDifficulty} /></div></article>; })}</div>
    <div className="table-shell hidden overflow-x-auto md:block"><table className="data-table min-w-[760px]"><thead><tr><th>Foydalanuvchi</th><th>Email</th><th>Rol</th><th>Daraja</th><th>Qo‘shilgan sana</th></tr></thead><tbody>{data!.items.map(user => { const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(); return <tr key={user.id}><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-xs font-bold text-sky-700">{initials}</span><b className="text-slate-900">{user.firstName} {user.lastName}</b></div></td><td>{user.email}</td><td>{roleSelect(user)}</td><td><DifficultyBadge value={user.currentDifficulty} /></td><td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '—'}</td></tr>; })}</tbody></table></div></>}
  </>;
}
