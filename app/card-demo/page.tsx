import {
  DefaultCardDemo,
  DotsCardDemo,
  GradientCardDemo,
  PlusCardDemo,
  NeubrutalismCardDemo,
  InnerCardDemo,
  LiftedCardDemo,
  CornersCardDemo,
} from "@/components/features/demos/CardDemo";

export default function CardDemoPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-[480px] space-y-8">
        <h1 className="text-2xl font-bold text-center mb-8">Card Variants</h1>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Default</h2>
          <DefaultCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Dots</h2>
          <DotsCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Gradient</h2>
          <GradientCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Plus</h2>
          <PlusCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Neubrutalism</h2>
          <NeubrutalismCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Inner</h2>
          <InnerCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Lifted</h2>
          <LiftedCardDemo />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Corners</h2>
          <CornersCardDemo />
        </div>
      </div>
    </main>
  );
}
