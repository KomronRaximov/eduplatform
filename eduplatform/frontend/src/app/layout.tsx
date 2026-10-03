import './globals.css';
import { Providers } from './providers';

export const metadata = { title: 'AdaptEdu — adaptiv ta’lim', description: 'Bilimingizga mos rivojlanadigan zamonaviy ta’lim platformasi' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="uz"><body><Providers>{children}</Providers></body></html>;
}
