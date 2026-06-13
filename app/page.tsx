import { App } from '@/components/App';

export default function Home() {
  return (
    <main className="min-h-screen min-h-dvh ledger-shell text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute bottom-[-7rem] right-[-5rem] h-64 w-64 rounded-full bg-[#c58a48]/10 blur-[90px]" />
      </div>

      <div className="relative z-10">
        <App />
      </div>
    </main>
  );
}
