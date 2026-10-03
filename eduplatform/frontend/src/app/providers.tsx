'use client'; import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; import { useEffect, useState } from 'react';
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  // Cached data is per-session: drop all of it the moment the session changes (login/logout).
  useEffect(() => { const clear = () => client.clear(); window.addEventListener('session-changed', clear); return () => window.removeEventListener('session-changed', clear); }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
