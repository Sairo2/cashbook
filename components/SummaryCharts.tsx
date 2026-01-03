'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SummaryChartsProps {
    transactions: Transaction[];
}

const COLORS = [
    'oklch(0.65 0.18 160)',  // emerald
    'oklch(0.65 0.18 280)',  // purple
    'oklch(0.75 0.18 75)',   // amber
    'oklch(0.6 0.18 245)',   // blue
    'oklch(0.65 0.15 180)',  // teal
    'oklch(0.7 0.18 350)',   // pink
    'oklch(0.65 0.22 25)',   // rose
    'oklch(0.55 0.2 280)',   // indigo
    'oklch(0.7 0.15 120)',   // lime
    'oklch(0.6 0.2 30)',     // orange
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                <p className="text-sm font-medium">{payload[0].name}</p>
                <p className="text-lg font-bold text-primary">
                    ₹{payload[0].value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                    {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%
                </p>
            </div>
        );
    }
    return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-medium"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export function SummaryCharts({ transactions }: SummaryChartsProps) {
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
            .map(([name, value]) => ({ name, value, total: totalExpenses }))
            .sort((a, b) => b.value - a.value);
    }, [expenses, totalExpenses]);

    // Group by person
    const personData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        transactions.forEach(t => {
            const person = t.person || 'Unknown';
            grouped[person] = (grouped[person] || 0) + t.amount;
        });
        const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value, total }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // Group by payment mode
    const paymentModeData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        transactions.forEach(t => {
            const mode = t.payment_mode || 'Unknown';
            grouped[mode] = (grouped[mode] || 0) + t.amount;
        });
        const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value, total }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // Income by category
    const incomeCategoryData = React.useMemo(() => {
        const grouped: Record<string, number> = {};
        income.forEach(t => {
            grouped[t.category] = (grouped[t.category] || 0) + t.amount;
        });
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value, total: totalIncome }))
            .sort((a, b) => b.value - a.value);
    }, [income, totalIncome]);

    if (transactions.length === 0) {
        return (
            <Card className="glass-card border-none">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <p>Add some transactions to see charts</p>
                </CardContent>
            </Card>
        );
    }

    const renderPieChart = (data: Array<{ name: string; value: number; total: number }>, title: string) => (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-center text-muted-foreground">{title}</h4>
            {data.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomLabel}
                            outerRadius={80}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center px-2">
                {data.slice(0, 6).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
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

    return (
        <Card className="glass-card border-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Summary</CardTitle>
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
                        {renderPieChart(categoryData, `Expenses by Category (₹${totalExpenses.toLocaleString()})`)}
                    </TabsContent>
                    <TabsContent value="income-category" className="mt-4">
                        {renderPieChart(incomeCategoryData, `Income by Category (₹${totalIncome.toLocaleString()})`)}
                    </TabsContent>
                    <TabsContent value="person" className="mt-4">
                        {renderPieChart(personData, 'Transactions by Person')}
                    </TabsContent>
                    <TabsContent value="payment" className="mt-4">
                        {renderPieChart(paymentModeData, 'Transactions by Payment Mode')}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
