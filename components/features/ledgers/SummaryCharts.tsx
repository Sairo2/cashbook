'use client';

import * as React from 'react';
import { Pie, PieChart, Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { Transaction } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChartIcon, BarChart3 } from 'lucide-react';

interface SummaryChartsProps {
    transactions: Transaction[];
}

// Pastel chart colors for light theme
const CHART_COLORS = [
    '#4A9D7E',   // sage green (primary)
    '#7C6DC7',   // soft purple
    '#D4A843',   // warm amber
    '#4A8DB7',   // soft blue
    '#5BA69E',   // teal
    '#D4738E',   // soft pink
    '#E87461',   // coral (destructive)
    '#5B6DC7',   // indigo
    '#7DB85A',   // lime green
    '#D48843',   // soft orange
];

export function SummaryCharts({ transactions }: SummaryChartsProps) {
    const [chartType, setChartType] = React.useState<'pie' | 'bar'>('pie');

    // Correctly memoize arrays to prevent triggering useMemo on every render
    const expenses = React.useMemo(() => transactions.filter(t => t.type === 'cash_out'), [transactions]);
    const income = React.useMemo(() => transactions.filter(t => t.type === 'cash_in'), [transactions]);
    
    const totalExpenses = React.useMemo(() => expenses.reduce((sum, t) => sum + t.amount, 0), [expenses]);
    const totalIncome = React.useMemo(() => income.reduce((sum, t) => sum + t.amount, 0), [income]);

    // Group expenses by category
    const categoryData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        expenses.forEach(t => {
            grouped[t.category] = (grouped[t.category] || 0) + t.amount;
        });
        return Object.entries(grouped)
            .map(([name, value], index) => ({
                name,
                value,
                fill: CHART_COLORS[index % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

    // Group all by person
    const personData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        transactions.forEach(t => {
            const person = t.person || 'Unknown';
            grouped[person] = (grouped[person] || 0) + t.amount;
        });
        return Object.entries(grouped)
            .map(([name, value], index) => ({
                name,
                value,
                fill: CHART_COLORS[index % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // Group all by payment mode
    const paymentModeData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        transactions.forEach(t => {
            const mode = t.payment_mode || 'Unknown';
            grouped[mode] = (grouped[mode] || 0) + t.amount;
        });
        return Object.entries(grouped)
            .map(([name, value], index) => ({
                name,
                value,
                fill: CHART_COLORS[index % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // Income by category
    const incomeCategoryData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        income.forEach(t => {
            grouped[t.category] = (grouped[t.category] || 0) + t.amount;
        });
        return Object.entries(grouped)
            .map(([name, value], index) => ({
                name,
                value,
                fill: CHART_COLORS[index % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [income]);

    // Generate chart config dynamically
    const generateChartConfig = (data: Array<{ name: string; fill: string }>) => {
        const config: ChartConfig = {};
        data.forEach((item) => {
            config[item.name] = {
                label: item.name,
                color: item.fill,
            };
        });
        return config;
    };

    if (transactions.length === 0) {
        return (
            <Card className="surface-card border border-border rounded-2xl">
                <CardContent className="py-12 text-center text-muted-foreground text-xs font-semibold">
                    <p>Add transactions to populate visual summaries</p>
                </CardContent>
            </Card>
        );
    }

    const renderPieChart = (data: Array<{ name: string; value: number; fill: string }>, title: string) => {
        const chartConfig = generateChartConfig(data);

        return (
            <div className="space-y-4 py-2">
                <h4 className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-widest">{title}</h4>
                {data.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-semibold">
                        No transactions to display
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[230px] [&_.recharts-surface]:overflow-visible">
                        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        nameKey="name"
                                        formatter={(value) => `₹${Number(value).toLocaleString()}`}
                                    />
                                }
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                paddingAngle={2}
                                strokeWidth={2}
                                label={({ cx, cy, midAngle, outerRadius, percent }) => {
                                    if (percent < 0.05) return null;
                                    const RADIAN = Math.PI / 180;
                                    const radius = outerRadius + 20;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            fill="currentColor"
                                            textAnchor={x > cx ? 'start' : 'end'}
                                            dominantBaseline="central"
                                            className="text-[9px] font-bold fill-muted-foreground/80 tracking-tight"
                                        >
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} className="stroke-background stroke-2" />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                )}
            </div>
        );
    };

    const renderBarChart = (data: Array<{ name: string; value: number; fill: string }>, title: string) => {
        const chartConfig = generateChartConfig(data);

        return (
            <div className="space-y-4 py-2">
                <h4 className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-widest">{title}</h4>
                {data.length === 0 ? (
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs font-semibold">
                        No transactions to display
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ left: -10, right: 10 }}
                        >
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={6}
                                axisLine={false}
                                width={65}
                                tick={{ fontSize: 9, fontWeight: 600, fill: '#8E8E93' }}
                            />
                            <XAxis
                                type="number"
                                hide
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        nameKey="name"
                                        formatter={(value) => `₹${Number(value).toLocaleString()}`}
                                    />
                                }
                            />
                            <Bar
                                dataKey="value"
                                radius={[0, 4, 4, 0]}
                                barSize={10}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </div>
        );
    };

    const renderChart = (data: Array<{ name: string; value: number; fill: string }>, title: string) => {
        return chartType === 'pie' ? renderPieChart(data, title) : renderBarChart(data, title);
    };

    return (
        <Card className="surface-card border border-border rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black tracking-tight text-foreground uppercase">Analysis</CardTitle>
                    {/* Chart Type Toggle */}
                    <div className="flex items-center gap-0.5 bg-muted/50 border border-border rounded-xl p-0.5">
                        <button
                            onClick={() => setChartType('pie')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider ${
                                chartType === 'pie'
                                    ? 'bg-primary/10 text-primary border border-primary/10 shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                            }`}
                            title="Pie Representation"
                        >
                            <PieChartIcon className="h-3.5 w-3.5" />
                            <span>Pie</span>
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider ${
                                chartType === 'bar'
                                    ? 'bg-primary/10 text-primary border border-primary/10 shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                            }`}
                            title="Bar Representation"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>Bar</span>
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-0">
                <Tabs defaultValue="expense-category" className="w-full">
                    <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl border border-border bg-muted/60">
                        <TabsTrigger value="expense-category" className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider">
                            Expenses
                        </TabsTrigger>
                        <TabsTrigger value="income-category" className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider">
                            Income
                        </TabsTrigger>
                        <TabsTrigger value="person" className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider">
                            Person
                        </TabsTrigger>
                        <TabsTrigger value="payment" className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider">
                            Mode
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="expense-category" className="mt-4 animate-fade-in">
                        {renderChart(categoryData, `Expenses (${categoryData.length} Cats) · Total ₹${totalExpenses.toLocaleString()}`)}
                    </TabsContent>
                    <TabsContent value="income-category" className="mt-4 animate-fade-in">
                        {renderChart(incomeCategoryData, `Income (${incomeCategoryData.length} Cats) · Total ₹${totalIncome.toLocaleString()}`)}
                    </TabsContent>
                    <TabsContent value="person" className="mt-4 animate-fade-in">
                        {renderChart(personData, `Transactions by Person (${personData.length} People)`)}
                    </TabsContent>
                    <TabsContent value="payment" className="mt-4 animate-fade-in">
                        {renderChart(paymentModeData, `Transactions by Mode (${paymentModeData.length} Modes)`)}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
