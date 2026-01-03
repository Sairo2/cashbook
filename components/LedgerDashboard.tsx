'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Tag as CategoryIcon,
    CreditCard,
    User,
    Plus,
    Minus,
    Search,
    ArrowLeft,
    BarChart3,
    List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction, TransactionType, Ledger } from '@/lib/supabase';
import { getTransactionsByLedger, createTransaction } from '@/lib/store';
import { AddTransactionDialog } from './AddTransactionDialog';
import { SummaryCharts } from './SummaryCharts';

interface LedgerDashboardProps {
    ledger: Ledger;
    onBack: () => void;
    userId: string;
}

export function LedgerDashboard({ ledger, onBack, userId }: LedgerDashboardProps) {
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [dialogType, setDialogType] = React.useState<TransactionType>('cash_in');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('transactions');

    React.useEffect(() => {
        loadTransactions();
    }, [ledger.id]);

    const loadTransactions = async () => {
        setLoading(true);
        const storedTransactions = await getTransactionsByLedger(ledger.id);
        setTransactions(storedTransactions);
        setLoading(false);
    };

    const handleAdd = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
        const newTransaction = await createTransaction(data);
        if (newTransaction) {
            setTransactions([newTransaction, ...transactions]);
        }
    };

    const openAddDialog = (type: TransactionType) => {
        setDialogType(type);
        setIsDialogOpen(true);
    };

    const totalIn = transactions
        .filter((t) => t.type === 'cash_in')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalOut = transactions
        .filter((t) => t.type === 'cash_out')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const balance = totalIn - totalOut;

    const filteredTransactions = transactions.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen pb-32 safe-area-top">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-xl hover:bg-accent/20 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold truncate">{ledger.name}</h1>
                        <p className="text-xs text-muted-foreground">
                            {transactions.length} transactions
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 py-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                    <Card className="glass-card border-none">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</span>
                                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                ₹{balance.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-emerald-500 uppercase tracking-wide">In</span>
                                <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <div className="text-lg font-bold text-emerald-500">
                                ₹{totalIn.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-rose-500 uppercase tracking-wide">Out</span>
                                <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500" />
                            </div>
                            <div className="text-lg font-bold text-rose-500">
                                ₹{totalOut.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* View Toggle */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-accent/20">
                        <TabsTrigger value="transactions" className="data-[state=active]:bg-primary/20">
                            <List className="h-4 w-4 mr-2" />
                            Transactions
                        </TabsTrigger>
                        <TabsTrigger value="summary" className="data-[state=active]:bg-primary/20">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Summary
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="transactions" className="mt-4 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search transactions..."
                                className="pl-10 h-11 glass-card border-none bg-accent/10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Transaction List */}
                        <div className="space-y-2.5">
                            {loading ? (
                                <div className="text-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="text-muted-foreground mt-4 text-sm">Loading...</p>
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                    <div className="bg-accent/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Wallet className="h-8 w-8 opacity-20" />
                                    </div>
                                    <p>No transactions found</p>
                                    <p className="text-sm mt-1">Add your first transaction!</p>
                                </div>
                            ) : (
                                filteredTransactions.map((t, index) => (
                                    <Card
                                        key={t.id}
                                        className="glass-card border-none active:scale-[0.98] transition-transform animate-slide-up"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <CardContent className="p-3.5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex gap-3 items-start flex-1 min-w-0">
                                                    <div className={`p-2.5 rounded-xl shrink-0 ${t.type === 'cash_in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {t.type === 'cash_in' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold truncate">{t.title}</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {format(new Date(t.created_at), 'dd MMM, hh:mm a')}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            <Badge variant="secondary" className="bg-accent/30 text-[10px] px-2 py-0.5">
                                                                <CategoryIcon className="h-2.5 w-2.5 mr-1" /> {t.category}
                                                            </Badge>
                                                            {t.payment_mode && (
                                                                <Badge variant="secondary" className="bg-accent/30 text-[10px] px-2 py-0.5">
                                                                    <CreditCard className="h-2.5 w-2.5 mr-1" /> {t.payment_mode}
                                                                </Badge>
                                                            )}
                                                            {t.person && (
                                                                <Badge variant="secondary" className="bg-accent/30 text-[10px] px-2 py-0.5">
                                                                    <User className="h-2.5 w-2.5 mr-1" /> {t.person}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`text-base font-bold shrink-0 ${t.type === 'cash_in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.type === 'cash_in' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="summary" className="mt-4">
                        <SummaryCharts transactions={transactions} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Fixed Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 z-30">
                <div className="max-w-[480px] mx-auto px-4 pb-6 pt-4 bg-gradient-to-t from-background via-background to-transparent">
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={() => openAddDialog('cash_in')}
                            className="h-14 text-base font-bold cash-in-gradient hover:opacity-90 shadow-lg shadow-emerald-500/20"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Cash In
                        </Button>
                        <Button
                            onClick={() => openAddDialog('cash_out')}
                            className="h-14 text-base font-bold cash-out-gradient hover:opacity-90 shadow-lg shadow-rose-500/20"
                        >
                            <Minus className="mr-2 h-5 w-5" /> Cash Out
                        </Button>
                    </div>
                </div>
            </div>

            <AddTransactionDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                type={dialogType}
                ledger={ledger}
                onAdd={handleAdd}
            />
        </div>
    );
}
