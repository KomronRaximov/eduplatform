'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { Icon } from '../../../components/icons';
import { DifficultyBadge, EmptyState, ErrorBox, Loading, PageHeader } from '../../../components/ui';
import { api } from '../../../lib/api';
import { Test } from '../../../types';

export default function AdminTestsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'tests'], queryFn: () => api<{ items: Test[] }>('/admin/tests') });
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => api(`/admin/tests/${id}`, { method: 'DELETE' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] }) });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox message={error.message} />;

  const action = <Link className="btn-primary" href="/admin/tests/create"><Icon name="plus" className="h-4 w-4" />Yangi test</Link>;
  return <><PageHeader eyebrow="Test boshqaruvi" title="Testlar" description="Testlar tarkibi, darajasi va faollik holatini boshqaring." action={action} />
    {!data?.items.length ? <EmptyState title="Testlar mavjud emas" description="Birinchi testni yarating va unga savollar qo‘shing." icon="tests" action={{ href: '/admin/tests/create', label: 'Test yaratish' }} /> : <><div className="grid gap-3 md:hidden">{data.items.map(test => <article className="card p-4" key={test.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-violet-600">{test.topic.name}</p><h2 className="mt-1 truncate font-bold">{test.title}</h2></div><DifficultyBadge value={test.difficulty} /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{test._count?.questions ?? 0} savol</span><span className={test.isActive ? 'text-emerald-600' : 'text-slate-400'}>{test.isActive ? 'Faol' : 'Nofaol'}</span><Link className="font-bold text-violet-600" href={`/admin/tests/${test.id}/edit`}>Tahrirlash</Link></div></article>)}</div>
    <div className="table-shell hidden overflow-x-auto md:block"><table className="data-table min-w-[800px]"><thead><tr><th>Test</th><th>Mavzu</th><th>Daraja</th><th>Savollar</th><th>Status</th><th /></tr></thead><tbody>{data.items.map(test => <tr key={test.id}><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600"><Icon name="tests" className="h-4 w-4" /></span><b className="text-slate-900">{test.title}</b></div></td><td>{test.topic.name}</td><td><DifficultyBadge value={test.difficulty} /></td><td>{test._count?.questions ?? 0}</td><td><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${test.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{test.isActive ? 'Faol' : 'Nofaol'}</span></td><td><div className="flex justify-end gap-2"><Link className="btn-secondary min-h-9 px-3 py-1.5" href={`/admin/tests/${test.id}/edit`}>Tahrirlash</Link><button className="btn-danger min-h-9 px-3 py-1.5" onClick={() => setPending({ id: test.id, name: test.title })}><Icon name="close" className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></>}
  <ConfirmDialog open={!!pending} destructive title="Testni o‘chirasizmi?" description={`“${pending?.name}” testi o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.`} confirmLabel="O‘chirish" cancelLabel="Bekor qilish" busy={remove.isPending} busyLabel="O‘chirilmoqda…" error={remove.error?.message} onConfirm={() => remove.mutate(pending!.id, { onSuccess: () => setPending(null) })} onCancel={() => { remove.reset(); setPending(null); }} />
  </>;
}
