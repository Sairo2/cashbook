'use client';

import * as React from 'react';
import { Pie, PieChart, Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { Transaction } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { PieChartIcon, BarChart3 } from 'lucide-react';

interface SummaryChartsProps {
    transactions: Transaction[];
}

const CHART_COLORS = [
    'hsl(160, 60%, 45%)',   // emerald
    'hsl(280, 60%, 55%)',   // purple
    'hsl(45, 80%, 55%)',    // amber
    'hsl(210, 70%, 50%)',   // blue
    'hsl(180, 50%, 45%)',   // teal
    'hsl(330, 60%, 55%)',   // pink
    'hsl(0, 65%, 55%)',     // rose
    'hsl(260, 60%, 45%)',   // indigo
    'hsl(90, 50%, 50%)',    // lime
    'hsl(25, 80%, 55%)',    // orange
];

export function SummaryCharts({ transactions }: SummaryChartsProps) {
    const [chartType, setChartType] = React.useState<'pie' | 'bar'>('pie');

    // Only consider cash_out for expense analysis
    const expenses = transactions.filter(t => t.type === 'cash_out');
    const income = transactions.filter(t => t.type === 'cash_in');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
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

    // Group by person
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

    // Group by payment mode
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
            <Card className="glass-card border-none">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <p>Add some transactions to see charts</p>
                </CardContent>
            </Card>
        );
    }

    const renderPieChart = (data: Array<{ name: string; value: number; fill: string }>, title: string) => {
        const chartConfig = generateChartConfig(data);
        const total = data.reduce((sum, d) => sum + d.value, 0);

        return (
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-center text-muted-foreground">{title}</h4>
                {data.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                        No data available
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px] [&_.recharts-surface]:overflow-visible">
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
                                innerRadius={45}
                                outerRadius={75}
                                paddingAngle={2}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
                                            className="text-xs fill-muted-foreground"
                                        >
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 justify-center px-2">
                    {data.slice(0, 6).map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-muted-foreground">{item.name}</span>
                        </div>
                    ))}
                    {data.length > 6 && (
                        <span className="text-xs text-muted-foreground">+{data.length - 6} more</span>
                    )}
                </div>
            </div>
        );
    };

    const renderBarChart = (data: Array<{ name: string; value: number; fill: string }>, title: string) => {
        const chartConfig = generateChartConfig(data);

        return (
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-center text-muted-foreground">{title}</h4>
                {data.length === 0 ? (
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                        No data available
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ left: 0, right: 20 }}
                        >
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={8}
                                axisLine={false}
                                width={70}
                                tick={{ fontSize: 10 }}
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
        <Card className="glass-card border-none">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Summary</CardTitle>
                    {/* Chart Type Toggle */}
                    <div className="flex items-center gap-1 bg-muted/50 border border-border/50 rounded-lg p-1">
                        <button
                            onClick={() => setChartType('pie')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium ${chartType === 'pie'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                }`}
                            title="Pie Chart"
                        >
                            <PieChartIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Pie</span>
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs font-medium ${chartType === 'bar'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                }`}
                            title="Bar Chart"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Bar</span>
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="expense-category" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-accent/20 h-auto p-1">
                        <TabsTrigger value="expense-category" className="text-xs py-2 px-1">
                            Expenses
                        </TabsTrigger>
                        <TabsTrigger value="income-category" className="text-xs py-2 px-1">
                            Income
                        </TabsTrigger>
                        <TabsTrigger value="person" className="text-xs py-2 px-1">
                            Person
                        </TabsTrigger>
                        <TabsTrigger value="payment" className="text-xs py-2 px-1">
                            Payment
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="expense-category" className="mt-4">
                        {renderChart(categoryData, `Expenses by Category (₹${totalExpenses.toLocaleString()})`)}
                    </TabsContent>
                    <TabsContent value="income-category" className="mt-4">
                        {renderChart(incomeCategoryData, `Income by Category (₹${totalIncome.toLocaleString()})`)}
                    </TabsContent>
                    <TabsContent value="person" className="mt-4">
                        {renderChart(personData, 'Transactions by Person')}
                    </TabsContent>
                    <TabsContent value="payment" className="mt-4">
                        {renderChart(paymentModeData, 'Transactions by Payment Mode')}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
