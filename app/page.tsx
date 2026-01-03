import { App } from '@/components/App';

export default function Home() {
  return (
    <main className="min-h-screen min-h-dvh bg-background text-foreground overflow-x-hidden">
      {/* Subtle Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-destructive/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10">
        <App />
      </div>
    </main>
  );
}
