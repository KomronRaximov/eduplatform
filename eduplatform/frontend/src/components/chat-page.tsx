'use client';

import { useEffect, useState } from 'react';
import { ChatView } from './chat-view';
import { EmptyState, Loading } from './ui';
import { sessionUser } from '../lib/auth';

export function ChatPage() {
  const [state, setState] = useState<{ id: string; role: string } | 'denied' | null>(null);
  useEffect(() => {
    const user = sessionUser();
    setState(user && (user.role === 'STUDENT' || user.role === 'TEACHER') ? { id: user.id, role: user.role } : 'denied');
  }, []);
  if (state === null) return <Loading />;
  if (state === 'denied') return <EmptyState icon="chat" title="Chat mavjud emas" description="Chat faqat talaba va o‘qituvchilar uchun" />;
  return <ChatView currentUserId={state.id} />;
}
