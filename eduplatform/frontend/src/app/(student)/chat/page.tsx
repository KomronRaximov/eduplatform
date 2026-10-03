'use client';

import { useEffect, useState } from 'react';
import { ChatView } from '../../../components/chat-view';
import { EmptyState, Loading } from '../../../components/ui';
import { sessionUser } from '../../../lib/auth';

export default function ChatPage() {
  const [state, setState] = useState<{ id: string; role: string } | 'denied' | null>(null);
  useEffect(() => {
    const user = sessionUser();
    setState(user && (user.role === 'STUDENT' || user.role === 'TEACHER') ? { id: user.id, role: user.role } : 'denied');
  }, []);
  if (state === null) return <Loading />;
  if (state === 'denied') return <EmptyState icon="chat" title="Chat mavjud emas" description="Chat faqat talaba va o‘qituvchilar uchun" />;
  return <ChatView currentUserId={state.id} />;
}
