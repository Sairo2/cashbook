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
    List,
    MoreVertical,
    Pencil,
    Trash2,
    Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Transaction, TransactionType, Ledger } from '@/lib/supabase';
import { getCategoryIcon } from '@/lib/category-icons';
import { getTransactionsByLedger, createTransaction, updateLedger, deleteLedger } from '@/lib/store';
import { AddTransactionDialog } from './AddTransactionDialog';
import { SummaryCharts } from './SummaryCharts';
import { AddLedgerDialog } from './AddLedgerDialog';
import { TransactionDetailDialog } from './TransactionDetailDialog';
import { exportLedgerToPDF } from '@/lib/export-pdf';

interface LedgerDashboardProps {
    ledger: Ledger;
    onBack: () => void;
    userId: string;
    onLedgerUpdated?: (ledger: Ledger) => void;
    onLedgerDeleted?: (ledgerId: string) => void;
}

export function LedgerDashboard({ ledger, onBack, userId, onLedgerUpdated, onLedgerDeleted }: LedgerDashboardProps) {
    const [currentLedger, setCurrentLedger] = React.useState<Ledger>(ledger);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [dialogType, setDialogType] = React.useState<TransactionType>('cash_in');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('transactions');

    // Edit/Delete ledger state
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Transaction detail state
    const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
    const [isTransactionDetailOpen, setIsTransactionDetailOpen] = React.useState(false);

    React.useEffect(() => {
        loadTransactions();
    }, [currentLedger.id]);

    React.useEffect(() => {
        setCurrentLedger(ledger);
    }, [ledger]);

    const loadTransactions = async () => {
        setLoading(true);
        const storedTransactions = await getTransactionsByLedger(currentLedger.id);
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

    // Handle transaction click
    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsTransactionDetailOpen(true);
    };

    // Handle transaction update
    const handleTransactionUpdated = (updatedTransaction: Transaction) => {
        setTransactions(transactions.map(t =>
            t.id === updatedTransaction.id ? updatedTransaction : t
        ));
        setSelectedTransaction(updatedTransaction);
    };

    // Handle transaction delete
    const handleTransactionDeleted = (transactionId: string) => {
        setTransactions(transactions.filter(t => t.id !== transactionId));
        setIsTransactionDetailOpen(false);
        setSelectedTransaction(null);
    };

    // Handle ledger edit
    const handleEditLedger = async (name: string, categories: string[], paymentModes: string[]) => {
        const updated = await updateLedger(currentLedger.id, {
            name,
            categories,
            payment_modes: paymentModes,
        });
        if (updated) {
            setCurrentLedger(updated);
            onLedgerUpdated?.(updated);
        }
        setIsEditDialogOpen(false);
    };

    // Handle ledger delete
    const handleDeleteLedger = async () => {
        setIsDeleting(true);
        const success = await deleteLedger(currentLedger.id);
        if (success) {
            onLedgerDeleted?.(currentLedger.id);
            onBack();
        }
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
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
                        <h1 className="text-lg font-bold truncate">{currentLedger.name}</h1>
                        <p className="text-xs text-muted-foreground">
                            {transactions.length} transactions
                        </p>
                    </div>

                    {/* Ellipsis Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 -mr-2 rounded-xl hover:bg-accent/20 transition-colors">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onClick={() => setIsEditDialogOpen(true)}
                                className="cursor-pointer"
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Ledger
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => exportLedgerToPDF(currentLedger, transactions)}
                                className="cursor-pointer"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Ledger
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 pt-3 pb-2">
                <div className="grid grid-cols-3 gap-2 pb-4">
                    <div className="bg-accent/20 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Wallet className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</span>
                        </div>
                        <div className={`text-base font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ₹{balance.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-emerald-500/10 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <ArrowUpCircle className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-500/80 uppercase tracking-wide">In</span>
                        </div>
                        <div className="text-base font-bold text-emerald-500">
                            ₹{totalIn.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-rose-500/10 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <ArrowDownCircle className="h-3 w-3 text-rose-500" />
                            <span className="text-[10px] text-rose-500/80 uppercase tracking-wide">Out</span>
                        </div>
                        <div className="text-base font-bold text-rose-500">
                            ₹{totalOut.toLocaleString()}
                        </div>
                    </div>
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
                        <div className="space-y-1.5">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                    <p className="text-muted-foreground mt-3 text-sm">Loading...</p>
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="bg-accent/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wallet className="h-6 w-6 opacity-20" />
                                    </div>
                                    <p className="text-sm">No transactions found</p>
                                    <p className="text-xs mt-0.5">Add your first transaction!</p>
                                </div>
                            ) : (
                                filteredTransactions.map((t, index) => {
                                    const IconComponent = getCategoryIcon(t.category);
                                    return (
                                        <div
                                            key={t.id}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-accent/5 hover:bg-accent/10 active:scale-[0.98] transition-all cursor-pointer animate-slide-up"
                                            style={{ animationDelay: `${index * 20}ms` }}
                                            onClick={() => handleTransactionClick(t)}
                                        >
                                            {/* Category Icon */}
                                            <div className="p-2 rounded-lg shrink-0 bg-accent/30">
                                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                                            </div>

                                            {/* Title and Date */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium truncate">{t.title}</h3>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {format(new Date(t.created_at), 'MMM dd')} • {format(new Date(t.created_at), 'h:mm a')}
                                                </p>
                                            </div>

                                            {/* Amount and Category */}
                                            <div className="shrink-0 text-right">
                                                <div className={`text-sm font-semibold ${t.type === 'cash_in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.type === 'cash_in' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                                </div>
                                                <span className="inline-block text-[10px] text-muted-foreground bg-accent/40 px-1.5 py-0.5 rounded-md mt-0.5">
                                                    {t.category}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
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
                ledger={currentLedger}
                onAdd={handleAdd}
            />

            {/* Edit Ledger Dialog */}
            <AddLedgerDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onAdd={handleEditLedger}
                editLedger={currentLedger}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Ledger</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{currentLedger.name}"</span>?
                            This will permanently delete the ledger and all {transactions.length} transactions.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteLedger}
                            disabled={isDeleting}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Transaction Detail Dialog */}
            <TransactionDetailDialog
                transaction={selectedTransaction}
                ledger={currentLedger}
                isOpen={isTransactionDetailOpen}
                onClose={() => {
                    setIsTransactionDetailOpen(false);
                    setSelectedTransaction(null);
                }}
                onTransactionUpdated={handleTransactionUpdated}
                onTransactionDeleted={handleTransactionDeleted}
            />
        </div>
    );
}
