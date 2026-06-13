import { PieChartDemo, PieChartDemoSimple } from "@/components/PieChartDemo"

export default function ChartsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-[480px] space-y-8">
        <h1 className="text-2xl font-bold text-center mb-8">Charts Demo</h1>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Pie Chart - Donut with Card</h2>
          <PieChartDemo />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Pie Chart - Simple</h2>
          <div className="bg-card border rounded-xl p-6">
            <PieChartDemoSimple />
          </div>
        </div>
      </div>
    </main>
  )
}
