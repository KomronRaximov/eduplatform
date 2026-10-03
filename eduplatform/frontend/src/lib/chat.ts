'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { getSocket } from './socket';
import { ChatMessage } from '../types';

export type MessagesCache = { items: ChatMessage[]; hasMore: boolean };

// Appends a message to the cache: no cache -> undefined (caller must not create a partial one), dedupes by id, keeps ascending createdAt.
export function appendMessage(cache: MessagesCache | undefined, message: ChatMessage): MessagesCache | undefined {
  if (!cache) return cache;
  if (cache.items.some((m) => m.id === message.id)) return cache;
  const items = [...cache.items, message];
  items.sort((a, b) => a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);
  return { ...cache, items };
}

// chat:read tells the SENDER that the OTHER party (readerId) read their messages,
// so the messages to mark are the ones NOT sent by the reader and still unread.
export function markMessagesRead(cache: MessagesCache | undefined, readerId: string, readAt: string): MessagesCache | undefined {
  if (!cache) return cache;
  return { ...cache, items: cache.items.map((m) => m.senderId !== readerId && m.readAt === null ? { ...m, readAt } : m) };
}

function sessionRole(): string | null {
  try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw)?.role ?? null : null; } catch { return null; }
}

export function useChatRealtime(): { connected: boolean } {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onConnect = () => { setConnected(true); qc.invalidateQueries({ queryKey: ['chat'] }); };
    const onDisconnect = () => setConnected(false);
    const onMessage = ({ message }: { message: ChatMessage }) => {
      const key = ['chat', 'messages', message.conversationId];
      if (qc.getQueryData<MessagesCache>(key)) qc.setQueryData<MessagesCache | undefined>(key, (old) => appendMessage(old, message));
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    };
    const onRead = ({ conversationId, readerId, readAt }: { conversationId: string; readerId: string; readAt: string }) => {
      qc.setQueryData<MessagesCache | undefined>(['chat', 'messages', conversationId], (old) => markMessagesRead(old, readerId, readAt));
    };
    const onUnread = ({ total }: { total: number }) => qc.setQueryData(['chat', 'unread'], { total });
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);
    socket.on('chat:unread', onUnread);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
      socket.off('chat:unread', onUnread);
    };
  }, [qc]);

  return { connected };
}

export function useUnreadCount(): number {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { const role = sessionRole(); setEnabled(role === 'STUDENT' || role === 'TEACHER'); }, []);
  const { data } = useQuery({ queryKey: ['chat', 'unread'], queryFn: () => api<{ total: number }>('/chat/unread-count'), enabled });
  return data?.total ?? 0;
}
