import { Brand } from '../../components/ui';
import { Icon } from '../../components/icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden min-h-screen overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,.36),transparent_35%),radial-gradient(circle_at_80%_75%,rgba(79,70,229,.26),transparent_40%)]" />
      <div className="soft-grid absolute inset-0 opacity-20" />
      <div className="relative"><Brand /></div>
      <div className="relative max-w-xl">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-violet-100 backdrop-blur"><Icon name="sparkles" className="h-4 w-4" />Shaxsiy o‘quv yo‘lingiz</span>
        <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.045em]">Har bir natija sizga mos yangi bosqichni ochadi.</h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">AdaptEdu bilim darajangizni tahlil qiladi va keyingi eng to‘g‘ri testni tavsiya etadi.</p>
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[['12+', 'Demo test'], ['120', 'Savol'], ['3', 'Daraja']].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"><b className="text-2xl">{value}</b><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}
        </div>
      </div>
      <p className="relative text-xs text-slate-500">© 2026 AdaptEdu. Bilimga mos texnologiya.</p>
    </section>
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f8fc] px-4 py-10 sm:px-8">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="relative w-full max-w-[460px]"><div className="mb-8 flex justify-center text-slate-950 lg:hidden"><Brand /></div>{children}</div>
    </section>
  </main>;
}
