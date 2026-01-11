'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
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
    Download,
    ChevronRight,
    X,
    Users,
    TrendingUp,
    TrendingDown,
    Send
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Transaction, Ledger } from '@/lib/supabase';
import { getTransactionsByLedger, createTransaction, updateLedger, deleteLedger } from '@/lib/store';
import { AddLendingDialog } from './AddLendingDialog';
import { EditLendingDialog } from './EditLendingDialog';
import { AddLedgerDialog } from './AddLedgerDialog';
import { exportLedgerToPDF } from '@/lib/export-pdf';

interface LendingsDashboardProps {
    ledger: Ledger;
    onBack: () => void;
    userId: string;
    onLedgerUpdated?: (ledger: Ledger) => void;
    onLedgerDeleted?: (ledgerId: string) => void;
}

interface PersonBalance {
    name: string;
    balance: number; // Positive = they owe you, Negative = you owe them
    totalLent: number;
    totalReceived: number;
    transactions: Transaction[];
    lastTransactionDate: Date;
}

export function LendingsDashboard({ ledger, onBack, userId, onLedgerUpdated, onLedgerDeleted }: LendingsDashboardProps) {
    const [currentLedger, setCurrentLedger] = React.useState<Ledger>(ledger);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [dialogDirection, setDialogDirection] = React.useState<'gave' | 'got'>('gave');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('people');

    // Edit/Delete ledger state
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Person detail state
    const [selectedPerson, setSelectedPerson] = React.useState<PersonBalance | null>(null);
    const [isPersonSheetOpen, setIsPersonSheetOpen] = React.useState(false);

    // Chart sheet state
    const [isChartSheetOpen, setIsChartSheetOpen] = React.useState(false);

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

    const openAddDialog = (direction: 'gave' | 'got') => {
        setDialogDirection(direction);
        setIsDialogOpen(true);
    };

    // Get list of existing people for the dropdown
    const existingPeople = React.useMemo(() => {
        const people = new Set<string>();
        transactions.forEach(t => {
            if (t.person) people.add(t.person);
        });
        return Array.from(people).sort();
    }, [transactions]);

    // Calculate person balances
    const personBalances = React.useMemo<PersonBalance[]>(() => {
        const balanceMap: Record<string, PersonBalance> = {};

        transactions.forEach(t => {
            const personName = t.person || 'Unknown';

            if (!balanceMap[personName]) {
                balanceMap[personName] = {
                    name: personName,
                    balance: 0,
                    totalLent: 0,
                    totalReceived: 0,
                    transactions: [],
                    lastTransactionDate: new Date(t.created_at),
                };
            }

            balanceMap[personName].transactions.push(t);

            // cash_out = You lent money (they owe you)
            // cash_in = They paid you back (received)
            if (t.type === 'cash_out') {
                balanceMap[personName].balance += t.amount;
                balanceMap[personName].totalLent += t.amount;
            } else {
                balanceMap[personName].balance -= t.amount;
                balanceMap[personName].totalReceived += t.amount;
            }

            const txDate = new Date(t.created_at);
            if (txDate > balanceMap[personName].lastTransactionDate) {
                balanceMap[personName].lastTransactionDate = txDate;
            }
        });

        // Sort transactions within each person by date (newest first)
        Object.values(balanceMap).forEach(person => {
            person.transactions.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        });

        return Object.values(balanceMap).sort((a, b) =>
            Math.abs(b.balance) - Math.abs(a.balance)
        );
    }, [transactions]);

    // Filter people by search
    const filteredPeople = personBalances.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Split into who owes you vs who you owe
    const theyOweYou = filteredPeople.filter(p => p.balance > 0);
    const youOweThem = filteredPeople.filter(p => p.balance < 0);
    const settled = filteredPeople.filter(p => p.balance === 0 && p.transactions.length > 0);

    const totalOwedToYou = theyOweYou.reduce((sum, p) => sum + p.balance, 0);
    const totalYouOwe = Math.abs(youOweThem.reduce((sum, p) => sum + p.balance, 0));

    // Handle person click
    const handlePersonClick = (person: PersonBalance) => {
        setSelectedPerson(person);
        setIsPersonSheetOpen(true);
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
        // Refresh person data
        if (selectedPerson) {
            const updatedPerson = personBalances.find(p => p.name === selectedPerson.name);
            if (updatedPerson) {
                setSelectedPerson(updatedPerson);
            }
        }
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

    const renderPersonCard = (person: PersonBalance, index: number) => {
        const isPositive = person.balance > 0;
        const isNegative = person.balance < 0;
        const isSettled = person.balance === 0;

        return (
            <div
                key={person.name}
                className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 hover:bg-accent/10 active:scale-[0.98] transition-all cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => handlePersonClick(person)}
            >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg ${isPositive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                    isNegative ? 'bg-gradient-to-br from-rose-500 to-pink-600' :
                        'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                    {person.name.charAt(0).toUpperCase()}
                </div>

                {/* Name and last transaction */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{person.name}</h3>
                    <p className="text-xs text-muted-foreground">
                        {person.transactions.length} transaction{person.transactions.length !== 1 ? 's' : ''} • {format(person.lastTransactionDate, 'MMM dd')}
                    </p>
                </div>

                {/* Balance */}
                <div className="text-right shrink-0">
                    <div className={`font-bold ${isPositive ? 'text-emerald-500' :
                        isNegative ? 'text-rose-500' :
                            'text-muted-foreground'
                        }`}>
                        {isPositive && '+'}₹{Math.abs(person.balance).toLocaleString()}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        {isPositive ? 'owes you' : isNegative ? 'you owe' : 'settled'}
                    </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
        );
    };

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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                            <Send className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold truncate">{currentLedger.name}</h1>
                            <p className="text-xs text-muted-foreground">
                                {personBalances.length} people • {transactions.length} transactions
                            </p>
                        </div>
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
                <div className="grid grid-cols-2 gap-2 pb-3">
                    <div className="bg-emerald-500/10 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-emerald-500/80 uppercase tracking-wide">They Owe You</span>
                        </div>
                        <div className="text-xl font-bold text-emerald-500">
                            ₹{totalOwedToYou.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {theyOweYou.length} {theyOweYou.length === 1 ? 'person' : 'people'}
                        </p>
                    </div>

                    <div className="bg-rose-500/10 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                            <span className="text-xs text-rose-500/80 uppercase tracking-wide">You Owe</span>
                        </div>
                        <div className="text-xl font-bold text-rose-500">
                            ₹{totalYouOwe.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {youOweThem.length} {youOweThem.length === 1 ? 'person' : 'people'}
                        </p>
                    </div>
                </div>

                {/* Net Balance */}
                {(totalOwedToYou > 0 || totalYouOwe > 0) && (
                    <div className="text-center py-2 mb-3 rounded-lg bg-accent/30">
                        <span className="text-xs text-muted-foreground">Net: </span>
                        <span className={`font-bold ${totalOwedToYou - totalYouOwe > 0
                            ? 'text-emerald-500'
                            : totalOwedToYou - totalYouOwe < 0
                                ? 'text-rose-500'
                                : 'text-muted-foreground'
                            }`}>
                            {totalOwedToYou - totalYouOwe >= 0 ? '+' : ''}₹{(totalOwedToYou - totalYouOwe).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                            {totalOwedToYou > totalYouOwe ? '(you\'re up)' : totalOwedToYou < totalYouOwe ? '(you owe more)' : '(balanced)'}
                        </span>
                    </div>
                )}

                {/* Balance Distribution Chart */}
                {personBalances.length > 0 && (
                    <div
                        className="mb-4 p-3 rounded-xl border border-border bg-card/50 cursor-pointer hover:bg-card/70 transition-colors active:scale-[0.99]"
                        onClick={() => setIsChartSheetOpen(true)}
                    >
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                            <BarChart3 className="h-3 w-3" />
                            Balance Distribution
                            <ChevronRight className="h-3 w-3 ml-auto" />
                        </h4>
                        <div className="space-y-2">
                            {personBalances.slice(0, 5).map((p) => {
                                const maxBalance = Math.max(
                                    ...personBalances.map(pb => Math.abs(pb.balance))
                                );
                                const percentage = maxBalance > 0 ? (Math.abs(p.balance) / maxBalance) * 100 : 0;
                                const isPositive = p.balance > 0;

                                return (
                                    <div key={p.name} className="flex items-center gap-2">
                                        <span className="text-xs w-16 truncate text-muted-foreground">{p.name}</span>
                                        <div className="flex-1 h-4 bg-accent/30 rounded-full overflow-hidden relative">
                                            <div
                                                className={`absolute top-0 h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500 left-1/2' : 'bg-rose-500 right-1/2'
                                                    }`}
                                                style={{
                                                    width: `${percentage / 2}%`,
                                                    ...(isPositive ? {} : { right: '50%', left: 'auto' })
                                                }}
                                            />
                                            <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                                        </div>
                                        <span className={`text-xs font-medium w-16 text-right ${isPositive ? 'text-emerald-500' : 'text-rose-500'
                                            }`}>
                                            {isPositive ? '+' : ''}₹{Math.abs(p.balance).toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                            {personBalances.length > 5 && (
                                <p className="text-xs text-primary text-center pt-1">
                                    Tap to see all {personBalances.length} people →
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search people..."
                        className="pl-10 h-11 glass-card border-none bg-accent/10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* People List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                            <p className="text-muted-foreground mt-3 text-sm">Loading...</p>
                        </div>
                    ) : personBalances.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="bg-accent/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 opacity-20" />
                            </div>
                            <p className="font-medium">No lending records yet</p>
                            <p className="text-xs mt-1">Start by recording a lending or repayment</p>
                        </div>
                    ) : (
                        <>
                            {/* They Owe You Section */}
                            {theyOweYou.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-medium text-emerald-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3" />
                                        They Owe You
                                    </h3>
                                    <div className="space-y-1.5">
                                        {theyOweYou.map((person, i) => renderPersonCard(person, i))}
                                    </div>
                                </div>
                            )}

                            {/* You Owe Section */}
                            {youOweThem.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-medium text-rose-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <TrendingDown className="h-3 w-3" />
                                        You Owe
                                    </h3>
                                    <div className="space-y-1.5">
                                        {youOweThem.map((person, i) => renderPersonCard(person, i))}
                                    </div>
                                </div>
                            )}

                            {/* Settled Section */}
                            {settled.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                                        ✓ Settled
                                    </h3>
                                    <div className="space-y-1.5">
                                        {settled.map((person, i) => renderPersonCard(person, i))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Fixed Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 z-30">
                <div className="max-w-[480px] mx-auto px-4 pb-6 pt-4 bg-gradient-to-t from-background via-background to-transparent">
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={() => openAddDialog('gave')}
                            className="h-14 text-base font-bold border bg-background hover:bg-accent/50 shadow-lg"
                        >
                            <ArrowUpCircle className="mr-2 h-5 w-5 text-rose-500" /> Gave
                        </Button>
                        <Button
                            onClick={() => openAddDialog('got')}
                            className="h-14 text-base font-bold border bg-background hover:bg-accent/50 shadow-lg"
                        >
                            <ArrowDownCircle className="mr-2 h-5 w-5 text-emerald-500" /> Got
                        </Button>
                    </div>
                </div>
            </div>

            {/* Chart Detail Sheet */}
            <Sheet open={isChartSheetOpen} onOpenChange={setIsChartSheetOpen}>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl max-w-[480px] mx-auto left-0 right-0">
                    <SheetHeader className="pb-4 pt-8 border-b border-border/50 pr-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <BarChart3 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl">Balance Distribution</SheetTitle>
                                <p className="text-sm text-muted-foreground">
                                    {personBalances.length} {personBalances.length === 1 ? 'person' : 'people'}
                                </p>
                            </div>
                        </div>

                        {/* Summary Legend */}
                        <div className="flex gap-4 mt-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-muted-foreground">They owe you: </span>
                                <span className="font-medium text-emerald-500">₹{totalOwedToYou.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-rose-500" />
                                <span className="text-muted-foreground">You owe: </span>
                                <span className="font-medium text-rose-500">₹{totalYouOwe.toLocaleString()}</span>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Full Chart */}
                    <div className="mt-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 180px)' }}>
                        {personBalances.map((p) => {
                            const maxBalance = Math.max(
                                ...personBalances.map(pb => Math.abs(pb.balance))
                            );
                            const percentage = maxBalance > 0 ? (Math.abs(p.balance) / maxBalance) * 100 : 0;
                            const isPositive = p.balance > 0;

                            return (
                                <div
                                    key={p.name}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedPerson(p);
                                        setIsChartSheetOpen(false);
                                        setIsPersonSheetOpen(true);
                                    }}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                                        }`}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium truncate">{p.name}</span>
                                            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>
                                                {isPositive ? '+' : ''}₹{Math.abs(p.balance).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-accent/30 rounded-full overflow-hidden relative">
                                            <div
                                                className={`absolute top-0 h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500 left-1/2' : 'bg-rose-500 right-1/2'
                                                    }`}
                                                style={{
                                                    width: `${percentage / 2}%`,
                                                    ...(isPositive ? {} : { right: '50%', left: 'auto' })
                                                }}
                                            />
                                            <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Person Detail Sheet */}
            <Sheet open={isPersonSheetOpen} onOpenChange={setIsPersonSheetOpen}>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl max-w-[480px] mx-auto left-0 right-0">
                    {selectedPerson && (
                        <>
                            <SheetHeader className="pb-4 pt-8 border-b border-border/50 pr-8">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${selectedPerson.balance > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                                        selectedPerson.balance < 0 ? 'bg-gradient-to-br from-rose-500 to-pink-600' :
                                            'bg-gradient-to-br from-gray-400 to-gray-500'
                                        }`}>
                                        {selectedPerson.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <SheetTitle className="text-xl">{selectedPerson.name}</SheetTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedPerson.transactions.length} transaction{selectedPerson.transactions.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-bold ${selectedPerson.balance > 0 ? 'text-emerald-500' :
                                            selectedPerson.balance < 0 ? 'text-rose-500' :
                                                'text-muted-foreground'
                                            }`}>
                                            {selectedPerson.balance > 0 && '+'}₹{Math.abs(selectedPerson.balance).toLocaleString()}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedPerson.balance > 0 ? 'owes you' :
                                                selectedPerson.balance < 0 ? 'you owe' : 'settled'}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <div className="bg-rose-500/10 rounded-lg px-3 py-2">
                                        <p className="text-xs text-rose-500/80">Total Gave</p>
                                        <p className="font-bold text-rose-500">₹{selectedPerson.totalLent.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 rounded-lg px-3 py-2">
                                        <p className="text-xs text-emerald-500/80">Total Got</p>
                                        <p className="font-bold text-emerald-500">₹{selectedPerson.totalReceived.toLocaleString()}</p>
                                    </div>
                                </div>
                            </SheetHeader>

                            {/* Transactions List */}
                            <div className="mt-4 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                    Transaction History
                                </h4>
                                {selectedPerson.transactions.map((t, index) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 hover:bg-accent/10 active:scale-[0.98] transition-all cursor-pointer"
                                        onClick={() => handleTransactionClick(t)}
                                    >
                                        <div className={`p-2 rounded-lg ${t.type === 'cash_out' ? 'bg-rose-500/20' : 'bg-emerald-500/20'
                                            }`}>
                                            {t.type === 'cash_out' ? (
                                                <ArrowUpCircle className="h-4 w-4 text-rose-500" />
                                            ) : (
                                                <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium truncate">{t.title}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(t.created_at), 'MMM dd, yyyy')} • {format(new Date(t.created_at), 'h:mm a')}
                                            </p>
                                        </div>

                                        <div className={`font-semibold ${t.type === 'cash_out' ? 'text-rose-500' : 'text-emerald-500'
                                            }`}>
                                            {t.type === 'cash_out' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <AddLendingDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                direction={dialogDirection}
                ledger={currentLedger}
                onAdd={handleAdd}
                existingPeople={existingPeople}
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

            {/* Edit Lending Dialog */}
            <EditLendingDialog
                transaction={selectedTransaction}
                ledger={currentLedger}
                isOpen={isTransactionDetailOpen}
                onClose={() => {
                    setIsTransactionDetailOpen(false);
                    setSelectedTransaction(null);
                }}
                onTransactionUpdated={handleTransactionUpdated}
                onTransactionDeleted={handleTransactionDeleted}
                existingPeople={existingPeople}
            />
        </div>
    );
}
