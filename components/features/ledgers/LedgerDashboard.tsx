'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AddTransactionDialog } from '@/components/features/ledgers/AddTransactionDialog';
import { SummaryCharts } from '@/components/features/ledgers/SummaryCharts';
import { AddLedgerDialog } from '@/components/features/ledgers/AddLedgerDialog';
import { TransactionDetailDialog } from '@/components/features/ledgers/TransactionDetailDialog';
import { exportLedgerToPDF } from '@/lib/export-pdf';

interface LedgerDashboardProps {
    ledger: Ledger;
    onBack: () => void;
    userId: string;
    onLedgerUpdated?: (ledger: Ledger) => void;
    onLedgerDeleted?: (ledgerId: string) => void;
}

export function LedgerDashboard({ ledger, onBack, onLedgerUpdated, onLedgerDeleted }: LedgerDashboardProps) {
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

    const loadTransactions = React.useCallback(async () => {
        setLoading(true);
        try {
            const storedTransactions = await getTransactionsByLedger(currentLedger.id);
            setTransactions(storedTransactions);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [currentLedger.id]);

    React.useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    React.useEffect(() => {
        setCurrentLedger(ledger);
    }, [ledger]);

    const handleAdd = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
        const newTransaction = await createTransaction(data);
        if (newTransaction) {
            setTransactions(prev => [newTransaction, ...prev]);
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
        setTransactions(prev => prev.map(t =>
            t.id === updatedTransaction.id ? updatedTransaction : t
        ));
        setSelectedTransaction(updatedTransaction);
    };

    // Handle transaction delete
    const handleTransactionDeleted = (transactionId: string) => {
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
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

    const totalIn = React.useMemo(() => transactions
        .filter((t) => t.type === 'cash_in')
        .reduce((acc, curr) => acc + curr.amount, 0), [transactions]);

    const totalOut = React.useMemo(() => transactions
        .filter((t) => t.type === 'cash_out')
        .reduce((acc, curr) => acc + curr.amount, 0), [transactions]);

    const balance = totalIn - totalOut;

    const filteredTransactions = React.useMemo(() => {
        return transactions.filter((t) =>
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transactions, searchQuery]);

    return (
        <div className="min-h-screen pb-32 page-enter">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/82 backdrop-blur-xl border-b border-border/70">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 rounded-xl hover:bg-card active:scale-95 transition-all text-muted-foreground hover:text-foreground"
                            aria-label="Go back to dashboard"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base font-extrabold truncate leading-tight tracking-tight">{currentLedger.name}</h1>
                            <p className="text-[11px] text-muted-foreground">
                                {transactions.length} Transactions
                            </p>
                        </div>
                    </div>

                    {/* Ellipsis Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 -mr-2 rounded-xl hover:bg-card active:scale-95 transition-all text-muted-foreground hover:text-foreground" aria-label="More actions">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 surface-card-elevated border-border rounded-xl">
                            <DropdownMenuItem
                                onClick={() => setIsEditDialogOpen(true)}
                                className="cursor-pointer py-2.5 text-sm rounded-lg"
                            >
                                <Pencil className="h-4 w-4 mr-2.5 text-muted-foreground" />
                                Edit Ledger
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => exportLedgerToPDF(currentLedger, transactions)}
                                className="cursor-pointer py-2.5 text-sm rounded-lg"
                            >
                                <Download className="h-4 w-4 mr-2.5 text-muted-foreground" />
                                Export PDF Report
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="cursor-pointer py-2.5 text-sm rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4 mr-2.5" />
                                Delete Ledger
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 pt-5 pb-3">
                <div className="grid grid-cols-3 gap-2.5 pb-5">
                    {/* Balance */}
                    <div className="surface-card rounded-[1.1rem] p-3 relative overflow-hidden group">
                        <div className="flex items-center gap-1 mb-1">
                            <Wallet className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[9px] font-bold text-muted-foreground">Balance</span>
                        </div>
                        <div className={`text-sm font-black truncate tracking-tight ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            ₹{balance.toLocaleString()}
                        </div>
                    </div>

                    {/* Cash In */}
                    <div className="surface-card rounded-[1.1rem] p-3 relative overflow-hidden">
                        <div className="flex items-center gap-1 mb-1">
                            <ArrowUpCircle className="h-3 w-3 text-primary" />
                            <span className="text-[9px] font-bold text-primary/80">Cash In</span>
                        </div>
                        <div className="text-sm font-black truncate tracking-tight text-primary">
                            ₹{totalIn.toLocaleString()}
                        </div>
                    </div>

                    {/* Cash Out */}
                    <div className="surface-card rounded-[1.1rem] p-3 relative overflow-hidden">
                        <div className="flex items-center gap-1 mb-1">
                            <ArrowDownCircle className="h-3 w-3 text-destructive" />
                            <span className="text-[9px] font-bold text-destructive/80">Cash Out</span>
                        </div>
                        <div className="text-sm font-black truncate tracking-tight text-destructive">
                            ₹{totalOut.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl border border-border bg-muted/70">
                        <TabsTrigger value="transactions" className="gap-1.5 py-2 text-xs font-semibold">
                            <List className="h-3.5 w-3.5" />
                            Transactions
                        </TabsTrigger>
                        <TabsTrigger value="summary" className="gap-1.5 py-2 text-xs font-semibold">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Visual Summary
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="transactions" className="mt-4 space-y-4 animate-fade-in">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search description or category..."
                                className="pl-10 h-11 surface-card rounded-full text-xs placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/45"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Transaction List */}
                        <div>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mx-auto mb-3"></div>
                                    <p className="text-muted-foreground text-xs font-medium">Loading ledger transactions...</p>
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="text-center py-16 px-4 surface-card rounded-[1.35rem]">
                                    <div className="bg-primary/5 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border border-border">
                                        <Wallet className="h-5 w-5 text-primary opacity-60" />
                                    </div>
                                    <p className="text-sm font-semibold mb-0.5">No transactions found</p>
                                    <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                                        {searchQuery ? 'Try matching different keywords.' : 'Add cash in or cash out transactions below!'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-[1.45rem] border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_12px_28px_rgba(41,35,26,0.055)]">
                                    {filteredTransactions.map((t, index) => {
                                        const IconComponent = getCategoryIcon(t.category);
                                        const isLast = index === filteredTransactions.length - 1;

                                        return (
                                            <div
                                                key={t.id}
                                                className={`flex min-h-[82px] items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted/35 active:bg-muted/55 cursor-pointer animate-slide-up ${
                                                    isLast ? '' : 'border-b border-border'
                                                }`}
                                                style={{ animationDelay: `${index * 15}ms` }}
                                                onClick={() => handleTransactionClick(t)}
                                                >
                                                {/* Category Icon */}
                                                <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground/70">
                                                    <IconComponent className="h-[18px] w-[18px]" />
                                                </div>

                                                {/* Title and Date */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <h3 className="text-[13px] font-semibold truncate text-foreground leading-tight">{t.title}</h3>
                                                    <p className="text-[11px] text-muted-foreground/78 font-normal leading-none">
                                                        {format(new Date(t.created_at), 'MMM dd, yyyy')} • {format(new Date(t.created_at), 'h:mm a')}
                                                    </p>
                                                </div>

                                                {/* Amount and Category */}
                                                <div className="shrink-0 text-right space-y-1.5">
                                                    <div className={`text-[13px] font-semibold leading-none ${t.type === 'cash_in' ? 'text-primary' : 'text-destructive'}`}>
                                                        {t.type === 'cash_in' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                                    </div>
                                                    <span className="inline-block max-w-[92px] truncate rounded-full border border-border/80 bg-muted/65 px-2.5 py-0.5 text-[10px] font-medium leading-4 text-muted-foreground">
                                                        {t.category}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="summary" className="mt-4 animate-fade-in">
                        <SummaryCharts transactions={transactions} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Fixed Action Buttons */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30">
                <div className="px-4 pb-5 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent">
                    <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-border bg-card/92 p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_18px_40px_rgba(41,35,26,0.16)] backdrop-blur-xl">
                        <Button
                            onClick={() => openAddDialog('cash_in')}
                            className="h-11 rounded-[1rem] text-xs font-semibold cash-in-gradient hover:opacity-95 active:scale-[0.98] transition-all shadow-sm shadow-primary/10"
                        >
                            <Plus className="mr-1 h-4 w-4 text-primary-foreground" /> Cash In
                        </Button>
                        <Button
                            onClick={() => openAddDialog('cash_out')}
                            className="h-11 rounded-[1rem] text-xs font-semibold cash-out-gradient hover:opacity-95 active:scale-[0.98] transition-all shadow-sm shadow-destructive/10"
                        >
                            <Minus className="mr-1 h-4 w-4 text-primary-foreground" /> Cash Out
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
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl surface-card-elevated border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold">Delete Ledger</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{currentLedger.name}&quot;</span>?
                            This will permanently delete the ledger and all <span className="font-semibold text-foreground">{transactions.length} transactions</span>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 sm:gap-0 mt-3">
                        <AlertDialogCancel className="flex-1 mt-0 text-xs py-2 rounded-xl bg-muted border-border hover:bg-accent">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteLedger}
                            disabled={isDeleting}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs py-2 rounded-xl shadow-md active:scale-98"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Ledger'}
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
