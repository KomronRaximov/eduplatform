'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { appendMessage, markMessagesRead, MessagesCache } from '../lib/chat';
import { ChatContact, ChatMessage } from '../types';
import { AttachmentView, CHAT_FILE_ACCEPT, CHAT_FILE_MAX_BYTES, formatSize, isAllowedChatFile } from './chat-attachment';
import { Icon } from './icons';
import { EmptyState, ErrorBox, Loading } from './ui';

const MAX_LENGTH = 2000;
const PAGE_SIZE = 30;
const time = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
export const personName = (c: ChatContact) => `${c.firstName} ${c.lastName}`.trim();

export function ChatThread({ conversationId, other, currentUserId, unreadCount, onBack }: { conversationId: string; other: ChatContact; currentUserId: string; unreadCount: number; onBack: () => void }) {
  const qc = useQueryClient();
  const key = ['chat', 'messages', conversationId];
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<string | null>(null);
  const handledUnreadRef = useRef(0);
  const attemptsRef = useRef<Record<string, number>>({});
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [retryTick, setRetryTick] = useState(0);

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: key,
    queryFn: () => api<MessagesCache>(`/chat/conversations/${conversationId}/messages?limit=${PAGE_SIZE}`),
  });
  const items = data?.items ?? [];
  const lastId = items.length ? items[items.length - 1].id : null;

  const send = useMutation({
    mutationFn: ({ body, file }: { body: string; file: File | null }) => {
      if (!file) return api<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
      const form = new FormData();
      form.append('file', file);
      if (body.trim()) form.append('body', body);
      return api<ChatMessage>(`/chat/conversations/${conversationId}/attachments`, { method: 'POST', body: form });
    },
    onSuccess: (message) => {
      qc.setQueryData<MessagesCache | undefined>(key, (old) => appendMessage(old, message));
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      setDraft('');
      setFile(null);
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const markRead = useMutation({
    mutationFn: (_trigger: string) => api<{ updated: number }>(`/chat/conversations/${conversationId}/read`, { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData<MessagesCache | undefined>(key, (old) => markMessagesRead(old, currentUserId, new Date().toISOString()));
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      qc.invalidateQueries({ queryKey: ['chat', 'unread'] });
    },
    // Silent retry (max 3 attempts per trigger key, 3s apart) so a transient failure doesn't leave the conversation unread.
    onError: (_e, trigger) => {
      attemptsRef.current[trigger] = (attemptsRef.current[trigger] ?? 0) + 1;
      if (attemptsRef.current[trigger] >= 3) return;
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => { markedRef.current = null; handledUnreadRef.current = 0; setRetryTick((t) => t + 1); }, 3000);
    },
  });
  const { mutate: markReadMutate } = markRead;
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  // Mark read when any other-party message in the loaded page is unread (once per newest pending id),
  // or once when the list says there are unread messages we haven't loaded (again only if the count grows).
  useEffect(() => {
    const pending = items.filter((m) => m.senderId !== currentUserId && m.readAt === null);
    if (pending.length > 0) {
      const trigger = `m:${pending[pending.length - 1].id}`;
      // Record the unread count this m: trigger covers BEFORE the guard, so a list refetch that lands mid-flight can't later fire a redundant u: POST.
      handledUnreadRef.current = Math.max(handledUnreadRef.current, unreadCount);
      if (markedRef.current === trigger) return;
      markedRef.current = trigger;
      markReadMutate(trigger);
    } else if (unreadCount === 0) {
      handledUnreadRef.current = 0;
    } else if (unreadCount > handledUnreadRef.current && data) {
      handledUnreadRef.current = unreadCount;
      markReadMutate(`u:${unreadCount}`);
    }
  }, [items, data, unreadCount, currentUserId, markReadMutate, retryTick]);

  // Scroll to the bottom only when the newest message changes (not when older ones are prepended).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  // Rasm kech yuklanib balandlik o'zgarsa, foydalanuvchi pastda turgan bo'lsa pastda qoldiramiz.
  const keepAtBottom = () => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 400) el.scrollTop = el.scrollHeight;
  };

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

  const canSend = (draft.trim().length > 0 || !!file) && draft.length <= MAX_LENGTH && !send.isPending;
  const submit = () => { if (canSend) send.mutate({ body: draft, file }); };
  const pickFile = (picked: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!picked) return;
    if (!isAllowedChatFile(picked.name)) { setError('Bu turdagi faylni yuborib bo‘lmaydi. Rasm, PDF, Word, Excel, PowerPoint, TXT, ZIP, MP3 yoki MP4 yuboring'); return; }
    if (picked.size > CHAT_FILE_MAX_BYTES) { setError(`Fayl hajmi ${formatSize(CHAT_FILE_MAX_BYTES)} dan oshmasligi kerak`); return; }
    setError('');
    setFile(picked);
  };

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
                {m.attachment && <div className={m.body ? 'mb-1.5' : ''}><AttachmentView messageId={m.id} attachment={m.attachment} mine={mine} onImageLoad={keepAtBottom} /></div>}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
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
        {file && <div className="mb-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
          <Icon name="paperclip" className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span><span className="shrink-0 text-xs text-violet-500">{formatSize(file.size)}</span>
          <button type="button" onClick={() => setFile(null)} disabled={send.isPending} aria-label="Faylni olib tashlash" className="grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-violet-100"><Icon name="close" className="h-3.5 w-3.5" /></button>
        </div>}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept={CHAT_FILE_ACCEPT} onChange={(e) => pickFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={send.isPending} aria-label="Fayl biriktirish" title="Fayl biriktirish (20 MB gacha)" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-50"><Icon name="paperclip" className="h-5 w-5" /></button>
          <textarea
            className="input min-h-[44px] flex-1 resize-none"
            rows={2}
            value={draft}
            maxLength={MAX_LENGTH}
            placeholder={file ? 'Izoh qo‘shing (ixtiyoriy)…' : 'Xabar yozing…'}
            aria-label="Xabar"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          />
          <button type="button" className="btn-primary" disabled={!canSend} onClick={submit}>{send.isPending ? 'Yuborilmoqda…' : 'Yuborish'}</button>
        </div>
        <p className="mt-1 text-right text-xs text-slate-400">{draft.length}/{MAX_LENGTH}</p>
      </div>
    </div>
  );
}
