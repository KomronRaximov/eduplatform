'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { appendMessage, markMessagesRead, MessagesCache } from '../lib/chat';
import { ChatContact, ChatMessage } from '../types';
import { Icon } from './icons';
import { EmptyState, ErrorBox, Loading } from './ui';

const MAX_LENGTH = 2000;
const PAGE_SIZE = 30;
const time = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
export const personName = (c: ChatContact) => `${c.firstName} ${c.lastName}`.trim();

export function ChatThread({ conversationId, other, currentUserId, onBack }: { conversationId: string; other: ChatContact; currentUserId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const key = ['chat', 'messages', conversationId];
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<string | null>(null);

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: key,
    queryFn: () => api<MessagesCache>(`/chat/conversations/${conversationId}/messages?limit=${PAGE_SIZE}`),
  });
  const items = data?.items ?? [];
  const lastId = items.length ? items[items.length - 1].id : null;

  const send = useMutation({
    mutationFn: (body: string) => api<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: (message) => {
      qc.setQueryData<MessagesCache | undefined>(key, (old) => appendMessage(old, message));
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      setDraft('');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const markRead = useMutation({
    mutationFn: () => api<{ updated: number }>(`/chat/conversations/${conversationId}/read`, { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData<MessagesCache | undefined>(key, (old) => markMessagesRead(old, currentUserId, new Date().toISOString()));
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      qc.invalidateQueries({ queryKey: ['chat', 'unread'] });
    },
  });
  const { mutate: markReadMutate } = markRead;

  // Mark as read when the newest message is from the other party and unread (once per newest message id).
  useEffect(() => {
    const last = items[items.length - 1];
    if (!last || last.senderId === currentUserId || last.readAt !== null) return;
    if (markedRef.current === last.id) return;
    markedRef.current = last.id;
    markReadMutate();
  }, [items, currentUserId, markReadMutate]);

  // Scroll to the bottom only when the newest message changes (not when older ones are prepended).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  async function loadOlder() {
    const first = items[0];
    if (!first || loadingOlder) return;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    setError('');
    try {
      const page = await api<MessagesCache>(`/chat/conversations/${conversationId}/messages?before=${first.id}&limit=${PAGE_SIZE}`);
      qc.setQueryData<MessagesCache | undefined>(key, (old) => {
        if (!old) return old;
        const known = new Set(old.items.map((m) => m.id));
        const merged = [...page.items.filter((m) => !known.has(m.id)), ...old.items];
        merged.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
        return { items: merged, hasMore: page.hasMore };
      });
      requestAnimationFrame(() => { if (el) el.scrollTop += el.scrollHeight - prevHeight; });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'So‘rov bajarilmadi');
    } finally {
      setLoadingOlder(false);
    }
  }

  const canSend = draft.trim().length > 0 && draft.length <= MAX_LENGTH && !send.isPending;
  const submit = () => { if (canSend) send.mutate(draft); };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Orqaga" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"><Icon name="arrow" className="h-5 w-5 rotate-180" /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{(other.firstName[0] ?? '?').toUpperCase()}</span>
        <div className="min-w-0"><b className="block truncate text-slate-900">{personName(other)}</b>{other.email && <span className="block truncate text-xs text-slate-400">{other.email}</span>}</div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {isLoading && <Loading />}
        {loadError && <ErrorBox message={loadError.message} />}
        {data?.hasMore && <div className="text-center"><button type="button" onClick={loadOlder} disabled={loadingOlder} className="text-sm font-semibold text-violet-600 hover:underline disabled:opacity-50">{loadingOlder ? 'Yuklanmoqda…' : 'Oldingilarini yuklash'}</button></div>}
        {data && items.length === 0 && <EmptyState icon="chat" title="Hali xabarlar yo‘q" description="Birinchi xabarni yozing." />}
        {items.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-violet-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800'}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <span className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? 'text-violet-200' : 'text-slate-400'}`}>
                  {time(m.createdAt)}
                  {mine && m.readAt && <span className="inline-flex items-center gap-0.5" title="O‘qildi"><Icon name="check" className="h-3 w-3" /><span className="sr-only">O‘qildi</span></span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 p-3">
        {error && <div className="mb-2"><ErrorBox message={error} /></div>}
        <div className="flex items-end gap-2">
          <textarea
            className="input min-h-[44px] flex-1 resize-none"
            rows={2}
            value={draft}
            maxLength={MAX_LENGTH}
            placeholder="Xabar yozing…"
            aria-label="Xabar"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          />
          <button type="button" className="btn-primary" disabled={!canSend} onClick={submit}>Yuborish</button>
        </div>
        <p className="mt-1 text-right text-xs text-slate-400">{draft.length}/{MAX_LENGTH}</p>
      </div>
    </div>
  );
}
