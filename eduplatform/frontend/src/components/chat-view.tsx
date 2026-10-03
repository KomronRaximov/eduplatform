'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { ChatContact, ChatConversation } from '../types';
import { ChatThread, personName } from './chat-thread';
import { Icon } from './icons';
import { EmptyState, ErrorBox, Loading, PageHeader } from './ui';

function NewChat({ onPick, onClose }: { onPick: (contact: ChatContact) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 300); return () => clearTimeout(t); }, [text]);
  const { data, isLoading, error } = useQuery({
    queryKey: ['chat', 'contacts', q],
    queryFn: () => api<ChatContact[]>(`/chat/contacts?q=${encodeURIComponent(q)}&limit=20`),
  });
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
        <b className="text-slate-900">Yangi suhbat</b>
        <button type="button" onClick={onClose} aria-label="Yopish" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Icon name="close" className="h-4 w-4" /></button>
      </div>
      <div className="p-3"><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ism bo‘yicha qidirish…" aria-label="Kontaktlarni qidirish" autoFocus /></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && <p className="p-3 text-sm text-slate-500">Yuklanmoqda…</p>}
        {error && <ErrorBox message={error.message} />}
        {data && data.length === 0 && <p className="p-3 text-sm text-slate-500">Hech kim topilmadi.</p>}
        {data?.map((c) => (
          <button key={c.id} type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{(c.firstName[0] ?? '?').toUpperCase()}</span>
            <span className="min-w-0"><b className="block truncate text-sm text-slate-800">{personName(c)}</b>{c.email && <span className="block truncate text-xs text-slate-400">{c.email}</span>}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatView({ currentUserId }: { currentUserId: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<ChatContact | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [reconnecting, setReconnecting] = useState(false);

  const { data: conversations, isLoading, error: listError } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => api<ChatConversation[]>('/chat/conversations'),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const down = () => setReconnecting(true);
    const up = () => setReconnecting(false);
    setReconnecting(!socket.connected);
    socket.on('connect', up);
    socket.on('disconnect', down);
    socket.on('connect_error', down);
    return () => { socket.off('connect', up); socket.off('disconnect', down); socket.off('connect_error', down); };
  }, []);

  const open = (id: string, other: ChatContact) => { setActiveId(id); setActiveOther(other); setPicking(false); };

  async function pick(contact: ChatContact) {
    setError('');
    try {
      const conversation = await api<ChatConversation>('/chat/conversations', { method: 'POST', body: JSON.stringify({ userId: contact.id }) });
      open(conversation.id, conversation.other ?? contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'So‘rov bajarilmadi');
    }
  }

  const active = conversations?.find((c) => c.id === activeId);
  const other = active?.other ?? activeOther;

  return (
    <div>
      <PageHeader eyebrow="Muloqot" title="Xabarlar" description="Ustoz va talabalar o‘rtasidagi suhbatlar." />
      {reconnecting && <p className="mb-3 text-sm font-medium text-amber-600" role="status">Qayta ulanmoqda…</p>}
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="card flex h-[calc(100vh-15rem)] min-h-[420px] overflow-hidden !p-0">
        <aside className={`${activeId && other ? 'hidden md:flex' : 'flex'} min-h-0 w-full flex-col border-slate-100 md:w-80 md:shrink-0 md:border-r`}>
          {picking ? <NewChat onPick={pick} onClose={() => setPicking(false)} /> : (
            <>
              <div className="border-b border-slate-100 p-3"><button type="button" className="btn-primary w-full" onClick={() => setPicking(true)}><Icon name="plus" className="h-4 w-4" />Yangi suhbat</button></div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading && <Loading />}
                {listError && <div className="p-3"><ErrorBox message={listError.message} /></div>}
                {conversations && conversations.length === 0 && <EmptyState icon="chat" title="Suhbatlar yo‘q" description="“Yangi suhbat” orqali yozishni boshlang." />}
                {conversations?.map((c) => (
                  <button key={c.id} type="button" onClick={() => open(c.id, c.other)} className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${c.id === activeId ? 'bg-violet-50' : ''}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{(c.other.firstName[0] ?? '?').toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{personName(c.other)}</b><span className="block truncate text-xs text-slate-500">{c.lastMessage ? `${c.lastMessage.senderId === currentUserId ? 'Siz: ' : ''}${c.lastMessage.body}` : 'Xabarlar yo‘q'}</span></span>
                    {c.unreadCount > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">{c.unreadCount}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
        <section className={`${activeId && other ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}>
          {activeId && other ? <ChatThread key={activeId} conversationId={activeId} other={other} currentUserId={currentUserId} unreadCount={active?.unreadCount ?? 0} onBack={() => setActiveId(null)} /> : <div className="grid flex-1 place-items-center p-6"><EmptyState icon="chat" title="Suhbatni tanlang" description="Chap tomondan suhbatni oching yoki yangisini boshlang." /></div>}
        </section>
      </div>
    </div>
  );
}
