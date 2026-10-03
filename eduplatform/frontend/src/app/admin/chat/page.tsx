'use client';

import { useEffect, useState } from 'react';
import { ChatView } from '../../../components/chat-view';
import { Loading } from '../../../components/ui';
import { sessionUser } from '../../../lib/auth';

export default function ChatPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { setUserId(sessionUser()?.id ?? null); }, []);
  if (!userId) return <Loading />;
  return <ChatView currentUserId={userId} />;
}
