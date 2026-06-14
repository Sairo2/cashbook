'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Search,
    ArrowLeft,
    BarChart3,
    MoreVertical,
    Pencil,
    Trash2,
    Download,
    ChevronRight,
    MessageCircle,
    MessageSquare,
    Share2,
    Users,
    TrendingUp,
    TrendingDown,
    Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Transaction, Ledger } from '@/lib/supabase';
import {
    getTransactionsByLedger,
    createTransaction,
    updateLedger,
    deleteLedger,
    getLendingContacts,
    upsertLendingContact,
} from '@/lib/store';
import { AddLendingDialog } from '@/components/features/lendings/AddLendingDialog';
import { EditLendingDialog } from '@/components/features/lendings/EditLendingDialog';
import { AddLedgerDialog } from '@/components/features/ledgers/AddLedgerDialog';
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

type ShareMethod = 'sms' | 'whatsapp';

interface LendingContactInfo {
    phone_number: string;
}

function normalizePhoneNumber(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, '');

    if (digits.length === 10) {
        return `91${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('0')) {
        return `91${digits.slice(1)}`;
    }

    return digits;
}

function createShareMessage(person: PersonBalance): string {
    const amount = `Rs ${Math.abs(person.balance).toLocaleString('en-IN')}`;

    if (person.balance > 0) {
        return `Hi ${person.name}, quick reminder from CashBook: you owe me ${amount}. I lent Rs ${person.totalLent.toLocaleString('en-IN')} and received Rs ${person.totalReceived.toLocaleString('en-IN')}. Please settle when possible.`;
    }

    if (person.balance < 0) {
        return `Hi ${person.name}, quick note from CashBook: I owe you ${amount}. I borrowed/received Rs ${person.totalReceived.toLocaleString('en-IN')} and repaid Rs ${person.totalLent.toLocaleString('en-IN')}. I will settle this soon.`;
    }

    return `Hi ${person.name}, our CashBook lending balance is settled. Thanks!`;
}

function getShareUrl(method: ShareMethod, phoneNumber: string, message: string): string {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);

    if (method === 'whatsapp') {
        return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
    }

    return `sms:+${normalizedPhone}?&body=${encodedMessage}`;
}

export function LendingsDashboard({ ledger, onBack, userId, onLedgerUpdated, onLedgerDeleted }: LendingsDashboardProps) {
    const [currentLedger, setCurrentLedger] = React.useState<Ledger>(ledger);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [contactsByPerson, setContactsByPerson] = React.useState<Record<string, LendingContactInfo>>({});
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [dialogDirection, setDialogDirection] = React.useState<'gave' | 'got'>('gave');
    const [searchQuery, setSearchQuery] = React.useState('');

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

    // Share reminder state
    const [sharePerson, setSharePerson] = React.useState<PersonBalance | null>(null);
    const [shareMethod, setShareMethod] = React.useState<ShareMethod | null>(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
    const [isPhoneDialogOpen, setIsPhoneDialogOpen] = React.useState(false);
    const [phoneInput, setPhoneInput] = React.useState('');
    const [phoneError, setPhoneError] = React.useState('');

    const loadTransactions = React.useCallback(async () => {
        setLoading(true);
        try {
            const storedTransactions = await getTransactionsByLedger(currentLedger.id);
            setTransactions(storedTransactions);
        } catch (error) {
            console.error('Failed to load lending transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [currentLedger.id]);

    React.useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const loadContacts = React.useCallback(async () => {
        const contacts = await getLendingContacts(userId, currentLedger.id);
        const nextContacts: Record<string, LendingContactInfo> = {};

        contacts.forEach((contact) => {
            nextContacts[contact.person_name.toLowerCase()] = {
                phone_number: contact.phone_number,
            };
        });

        setContactsByPerson(nextContacts);
    }, [currentLedger.id, userId]);

    React.useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    React.useEffect(() => {
        setCurrentLedger(ledger);
    }, [ledger]);

    const handleAdd = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
        const newTransaction = await createTransaction(data);
        if (newTransaction) {
            setTransactions(prev => [newTransaction, ...prev]);
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
    const filteredPeople = React.useMemo(() => {
        return personBalances.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [personBalances, searchQuery]);

    // Split into who owes you vs who you owe
    const theyOweYou = React.useMemo(() => filteredPeople.filter(p => p.balance > 0), [filteredPeople]);
    const youOweThem = React.useMemo(() => filteredPeople.filter(p => p.balance < 0), [filteredPeople]);
    const settled = React.useMemo(() => filteredPeople.filter(p => p.balance === 0 && p.transactions.length > 0), [filteredPeople]);

    const totalOwedToYou = React.useMemo(() => theyOweYou.reduce((sum, p) => sum + p.balance, 0), [theyOweYou]);
    const totalYouOwe = React.useMemo(() => Math.abs(youOweThem.reduce((sum, p) => sum + p.balance, 0)), [youOweThem]);
    const maxAbsoluteBalance = React.useMemo(
        () => personBalances.reduce((max, person) => Math.max(max, Math.abs(person.balance)), 0),
        [personBalances]
    );

    // Sync selectedPerson reactive state when transactions are added or deleted
    React.useEffect(() => {
        if (selectedPerson) {
            const updated = personBalances.find(p => p.name === selectedPerson.name);
            if (updated) {
                const hasChanged = updated.transactions.length !== selectedPerson.transactions.length ||
                                   updated.balance !== selectedPerson.balance ||
                                   updated.totalLent !== selectedPerson.totalLent ||
                                   updated.totalReceived !== selectedPerson.totalReceived;
                if (hasChanged) {
                    setSelectedPerson(updated);
                }
            } else {
                setSelectedPerson(null);
                setIsPersonSheetOpen(false);
            }
        }
    }, [personBalances, selectedPerson]);

    // Handle person click
    const handlePersonClick = (person: PersonBalance) => {
        setSelectedPerson(person);
        setIsPersonSheetOpen(true);
    };

    const getSavedPhoneNumber = React.useCallback((personName: string) => {
        return contactsByPerson[personName.toLowerCase()]?.phone_number;
    }, [contactsByPerson]);

    const openSharePicker = (person: PersonBalance) => {
        setSharePerson(person);
        setShareMethod(null);
        setPhoneError('');
        setIsShareDialogOpen(true);
    };

    const openShareTarget = React.useCallback((person: PersonBalance, method: ShareMethod, phoneNumber: string) => {
        const url = getShareUrl(method, phoneNumber, createShareMessage(person));

        if (method === 'whatsapp') {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        window.location.href = url;
    }, []);

    const handleShareMethod = (method: ShareMethod) => {
        if (!sharePerson) return;

        const savedPhoneNumber = getSavedPhoneNumber(sharePerson.name);
        setShareMethod(method);

        if (savedPhoneNumber) {
            setIsShareDialogOpen(false);
            openShareTarget(sharePerson, method, savedPhoneNumber);
            return;
        }

        setPhoneInput('');
        setPhoneError('');
        setIsShareDialogOpen(false);
        setIsPhoneDialogOpen(true);
    };

    const handleSavePhoneAndShare = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!sharePerson || !shareMethod) return;

        const normalizedPhone = normalizePhoneNumber(phoneInput);

        if (normalizedPhone.length < 11) {
            setPhoneError('Enter a valid mobile number with country code, or a 10 digit Indian number.');
            return;
        }

        const savedContact = await upsertLendingContact(
            userId,
            currentLedger.id,
            sharePerson.name,
            normalizedPhone
        );

        if (!savedContact) {
            setPhoneError('Could not save this number. Please try again.');
            return;
        }

        setContactsByPerson(prev => ({
            ...prev,
            [sharePerson.name.toLowerCase()]: {
                phone_number: normalizedPhone,
            },
        }));

        setIsPhoneDialogOpen(false);
        openShareTarget(sharePerson, shareMethod, normalizedPhone);
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

    const renderPersonCard = (person: PersonBalance, index: number, isLast: boolean) => {
        const isPositive = person.balance > 0;
        const isNegative = person.balance < 0;

        return (
            <div
                key={person.name}
                className={`flex min-h-[80px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 active:bg-muted/55 cursor-pointer animate-slide-up ${
                    isLast ? '' : 'border-b border-border'
                }`}
                style={{ animationDelay: `${index * 25}ms` }}
                onClick={() => handlePersonClick(person)}
            >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs border shadow-sm shrink-0 ${
                    isPositive 
                        ? 'bg-primary border-primary/20' 
                        : isNegative 
                        ? 'bg-destructive border-destructive/20' 
                        : 'bg-muted-foreground border-muted-foreground/20'
                }`}>
                    {person.name.charAt(0).toUpperCase()}
                </div>

                {/* Name and last transaction */}
                <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className="font-semibold text-[13px] leading-tight text-foreground truncate">{person.name}</h3>
                    <p className="text-[11px] text-muted-foreground/80 font-normal">
                        {person.transactions.length} record{person.transactions.length !== 1 ? 's' : ''} • {format(person.lastTransactionDate, 'MMM dd')}
                    </p>
                </div>

                {/* Balance */}
                <div className="text-right shrink-0 space-y-1.5">
                    <div className={`font-semibold text-[13px] leading-none ${
                        isPositive ? 'text-primary' :
                        isNegative ? 'text-destructive' :
                        'text-muted-foreground'
                    }`}>
                        {isPositive && '+'}₹{Math.abs(person.balance).toLocaleString()}
                    </div>
                    <p className="rounded-full border border-border/80 bg-muted/65 px-2.5 py-0.5 text-[10px] font-medium leading-4 text-muted-foreground">
                        {isPositive ? 'owes you' : isNegative ? 'you owe' : 'settled'}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen pb-32 page-enter">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/82 backdrop-blur-xl border-b border-border/70">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 rounded-xl hover:bg-card active:scale-95 transition-all text-muted-foreground hover:text-foreground"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl border border-primary/20 bg-accent/70 p-1.5 text-primary">
                                <Send className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base font-extrabold truncate leading-tight tracking-tight">{currentLedger.name}</h1>
                                <p className="text-[11px] text-muted-foreground">
                                    {personBalances.length} People • {transactions.length} Records
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ellipsis Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 -mr-2 rounded-xl hover:bg-card active:scale-95 transition-all text-muted-foreground hover:text-foreground" aria-label="Menu">
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
                <div className="grid grid-cols-2 gap-3 pb-4">
                    {/* They Owe You */}
                    <div className="surface-card rounded-[1.1rem] p-3.5 relative overflow-hidden group">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-[9px] font-bold text-primary/80">They Owe You</span>
                        </div>
                        <div className="text-lg font-black tracking-tight text-primary">
                            ₹{totalOwedToYou.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                            {theyOweYou.length} {theyOweYou.length === 1 ? 'person' : 'people'}
                        </p>
                    </div>

                    {/* You Owe */}
                    <div className="surface-card rounded-[1.1rem] p-3.5 relative overflow-hidden group">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingDown className="h-4 w-4 text-destructive" />
                            <span className="text-[9px] font-bold text-destructive/80">You Owe</span>
                        </div>
                        <div className="text-lg font-black tracking-tight text-destructive">
                            ₹{totalYouOwe.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                            {youOweThem.length} {youOweThem.length === 1 ? 'person' : 'people'}
                        </p>
                    </div>
                </div>

                {/* Net Balance Pill */}
                {(totalOwedToYou > 0 || totalYouOwe > 0) && (
                    <div className="text-center py-2.5 mb-5 rounded-full bg-muted/70 border border-border text-xs">
                        <span className="text-muted-foreground font-medium">Net Standing: </span>
                        <span className={`font-black tracking-tight ${
                            totalOwedToYou - totalYouOwe > 0 ? 'text-primary' :
                            totalOwedToYou - totalYouOwe < 0 ? 'text-destructive' :
                            'text-muted-foreground'
                        }`}>
                            {totalOwedToYou - totalYouOwe >= 0 ? '+' : ''}₹{(totalOwedToYou - totalYouOwe).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 font-bold ml-1.5 lowercase">
                            {totalOwedToYou > totalYouOwe ? "(you're up)" : totalOwedToYou < totalYouOwe ? '(you owe more)' : '(perfectly balanced)'}
                        </span>
                    </div>
                )}

                {/* Balance Distribution Summary Panel */}
                {personBalances.length > 0 && (
                    <div
                        className="mb-5 p-4 rounded-[1.1rem] surface-card cursor-pointer active:scale-[0.99] transition-all hover:border-primary/20"
                        onClick={() => setIsChartSheetOpen(true)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                                Balance Spread
                            </h4>
                            <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                                See Full Chart <ChevronRight className="h-3 w-3" />
                            </span>
                        </div>
                        <div className="space-y-3.5">
                            {personBalances.slice(0, 3).map((p) => {
                                const percentage = maxAbsoluteBalance > 0 ? (Math.abs(p.balance) / maxAbsoluteBalance) * 100 : 0;
                                const isPositive = p.balance > 0;

                                return (
                                    <div key={p.name} className="flex items-center gap-2">
                                        <span className="text-xs font-semibold w-16 truncate text-muted-foreground">{p.name}</span>
                                        <div className="flex-1 h-3 bg-muted border border-border rounded-full overflow-hidden relative">
                                            <div
                                                className={`absolute top-0 h-full rounded-full transition-all ${
                                                    isPositive ? 'bg-primary/80 left-1/2' : 'bg-destructive/80 right-1/2'
                                                }`}
                                                style={{
                                                    width: `${percentage / 2}%`,
                                                    ...(isPositive ? {} : { right: '50%', left: 'auto' })
                                                }}
                                            />
                                            <div className="absolute top-0 left-1/2 w-[1px] h-full bg-border" />
                                        </div>
                                        <span className={`text-xs font-black w-20 text-right tracking-tight ${
                                            isPositive ? 'text-primary' : 'text-destructive'
                                        }`}>
                                            {isPositive ? '+' : ''}₹{Math.abs(p.balance).toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-5">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search person by name..."
                        className="pl-10 h-11 surface-card rounded-full text-xs placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/45"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* People List */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mx-auto mb-3"></div>
                            <p className="text-muted-foreground text-xs font-medium">Loading ledger data...</p>
                        </div>
                    ) : personBalances.length === 0 ? (
                        <div className="text-center py-16 px-4 surface-card rounded-[1.35rem]">
                            <div className="bg-primary/5 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border border-border">
                                <Users className="h-5 w-5 text-primary opacity-60" />
                            </div>
                            <p className="text-sm font-semibold mb-0.5">No lending records yet</p>
                            <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                                Record lendings or repayments to start managing debt cycles.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* They Owe You Section */}
                            {theyOweYou.length > 0 && (
                                <div className="space-y-2.5">
                                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        They Owe You ({theyOweYou.length})
                                    </h3>
                                    <div className="overflow-hidden rounded-[1.45rem] border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_12px_28px_rgba(41,35,26,0.055)]">
                                        {theyOweYou.map((person, i) => renderPersonCard(person, i, i === theyOweYou.length - 1))}
                                    </div>
                                </div>
                            )}

                            {/* You Owe Section */}
                            {youOweThem.length > 0 && (
                                <div className="space-y-2.5 pt-2">
                                    <h3 className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        <TrendingDown className="h-3.5 w-3.5" />
                                        You Owe ({youOweThem.length})
                                    </h3>
                                    <div className="overflow-hidden rounded-[1.45rem] border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_12px_28px_rgba(41,35,26,0.055)]">
                                        {youOweThem.map((person, i) => renderPersonCard(person, i, i === youOweThem.length - 1))}
                                    </div>
                                </div>
                            )}

                            {/* Settled Section */}
                            {settled.length > 0 && (
                                <div className="space-y-2.5 pt-2">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        ✓ Settled ({settled.length})
                                    </h3>
                                    <div className="overflow-hidden rounded-[1.45rem] border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_12px_28px_rgba(41,35,26,0.055)]">
                                        {settled.map((person, i) => renderPersonCard(person, i, i === settled.length - 1))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Fixed Action Buttons */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30">
                <div className="px-4 pb-5 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent">
                    <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-border bg-card/92 p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_18px_40px_rgba(41,35,26,0.16)] backdrop-blur-xl">
                        <Button
                            onClick={() => openAddDialog('gave')}
                            className="h-11 rounded-[1rem] text-xs font-semibold cash-out-gradient hover:opacity-95 active:scale-[0.98] transition-all shadow-sm shadow-destructive/10"
                        >
                            <ArrowUpCircle className="mr-1.5 h-4 w-4 text-primary-foreground" /> Gave
                        </Button>
                        <Button
                            onClick={() => openAddDialog('got')}
                            className="h-11 rounded-[1rem] text-xs font-semibold cash-in-gradient hover:opacity-95 active:scale-[0.98] transition-all shadow-sm shadow-primary/10"
                        >
                            <ArrowDownCircle className="mr-1.5 h-4 w-4 text-primary-foreground" /> Got
                        </Button>
                    </div>
                </div>
            </div>

            {/* Chart Detail Sheet */}
            <Sheet open={isChartSheetOpen} onOpenChange={setIsChartSheetOpen}>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl max-w-[480px] mx-auto left-0 right-0 surface-card-elevated border-border">
                    <SheetHeader className="pb-4 pt-6 border-b border-border pr-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <SheetTitle className="text-base font-bold">Balance Distribution</SheetTitle>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                    {personBalances.length} Active Records
                                </p>
                            </div>
                        </div>

                        {/* Summary Legend */}
                        <div className="flex gap-4 mt-3 text-[10px] font-semibold uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded bg-primary" />
                                <span className="text-muted-foreground">They owe: </span>
                                <span className="font-black text-primary">₹{totalOwedToYou.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded bg-destructive" />
                                <span className="text-muted-foreground">You owe: </span>
                                <span className="font-black text-destructive">₹{totalYouOwe.toLocaleString()}</span>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Full Chart */}
                    <div className="mt-4 space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 'calc(70vh - 160px)' }}>
                        {personBalances.map((p) => {
                            const percentage = maxAbsoluteBalance > 0 ? (Math.abs(p.balance) / maxAbsoluteBalance) * 100 : 0;
                            const isPositive = p.balance > 0;

                            return (
                                <div
                                    key={p.name}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-black/[0.03] cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedPerson(p);
                                        setIsChartSheetOpen(false);
                                        setIsPersonSheetOpen(true);
                                    }}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs border ${
                                        isPositive ? 'bg-primary border-primary/20' : 'bg-destructive border-destructive/20'
                                    }`}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold truncate text-foreground">{p.name}</span>
                                            <span className={`text-xs font-black tracking-tight ${
                                                isPositive ? 'text-primary' : 'text-destructive'
                                            }`}>
                                                {isPositive ? '+' : ''}₹{Math.abs(p.balance).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted border border-border rounded-full overflow-hidden relative">
                                            <div
                                                className={`absolute top-0 h-full rounded-full transition-all ${
                                                    isPositive ? 'bg-primary left-1/2' : 'bg-destructive right-1/2'
                                                }`}
                                                style={{
                                                    width: `${percentage / 2}%`,
                                                    ...(isPositive ? {} : { right: '50%', left: 'auto' })
                                                }}
                                            />
                                            <div className="absolute top-0 left-1/2 w-[1px] h-full bg-border" />
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/45 flex-shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Person Detail Sheet */}
            <Sheet open={isPersonSheetOpen} onOpenChange={setIsPersonSheetOpen}>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl max-w-[480px] mx-auto left-0 right-0 surface-card-elevated border-border">
                    {selectedPerson && (
                        <>
                            <SheetHeader className="pb-4 pt-6 border-b border-border pr-8">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm border shadow-sm ${
                                        selectedPerson.balance > 0 
                                            ? 'bg-primary border-primary/20' :
                                        selectedPerson.balance < 0 
                                            ? 'bg-destructive border-destructive/20' :
                                        'bg-muted-foreground border-muted-foreground/20'
                                    }`}>
                                        {selectedPerson.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <SheetTitle className="text-sm font-black text-foreground truncate">{selectedPerson.name}</SheetTitle>
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                            {selectedPerson.transactions.length} record{selectedPerson.transactions.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-base font-black tracking-tight ${
                                            selectedPerson.balance > 0 ? 'text-primary' :
                                            selectedPerson.balance < 0 ? 'text-destructive' :
                                            'text-muted-foreground'
                                        }`}>
                                            {selectedPerson.balance > 0 && '+'}₹{Math.abs(selectedPerson.balance).toLocaleString()}
                                        </div>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {selectedPerson.balance > 0 ? 'owes you' :
                                                selectedPerson.balance < 0 ? 'you owe' : 'settled'}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="bg-destructive/[0.05] border border-destructive/10 rounded-xl px-3.5 py-2.5">
                                        <p className="text-destructive/80 mb-0.5">Total Gave (Lent)</p>
                                        <p className="text-sm font-black text-destructive">₹{selectedPerson.totalLent.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-primary/[0.05] border border-primary/10 rounded-xl px-3.5 py-2.5">
                                        <p className="text-primary/80 mb-0.5">Total Got (Received)</p>
                                        <p className="text-sm font-black text-primary">₹{selectedPerson.totalReceived.toLocaleString()}</p>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => openSharePicker(selectedPerson)}
                                    variant="outline"
                                    className="mt-3 h-9 w-full rounded-xl border-border/80 bg-muted/35 text-xs font-medium text-muted-foreground shadow-none hover:bg-muted/55 hover:text-foreground active:scale-[0.98]"
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                    Share Reminder
                                </Button>
                            </SheetHeader>

                            {/* Transactions List */}
                            <div className="mt-4 space-y-2 overflow-y-auto px-4 pb-2" style={{ maxHeight: 'calc(85vh - 220px)' }}>
                                <h4 className="text-sm font-semibold text-foreground">
                                    Record history
                                </h4>
                                <div className="overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.86)_inset,0_10px_24px_rgba(41,35,26,0.045)]">
                                    {selectedPerson.transactions.map((t, index) => {
                                        const isLast = index === selectedPerson.transactions.length - 1;

                                        return (
                                            <div
                                                key={t.id}
                                                className={`flex min-h-[76px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 active:bg-muted/55 cursor-pointer ${
                                                    isLast ? '' : 'border-b border-border'
                                                }`}
                                                onClick={() => handleTransactionClick(t)}
                                            >
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <h3 className="text-[13px] font-semibold text-foreground truncate leading-tight">{t.title}</h3>
                                                    <p className="text-[11px] text-muted-foreground/80 font-normal leading-none">
                                                        {format(new Date(t.created_at), 'MMM dd, yyyy')} • {format(new Date(t.created_at), 'h:mm a')}
                                                    </p>
                                                </div>

                                                <div className={`text-[13px] font-semibold shrink-0 ${
                                                    t.type === 'cash_out' ? 'text-destructive' : 'text-primary'
                                                }`}>
                                                    {t.type === 'cash_out' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl surface-card-elevated border-border">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            Share with {sharePerson?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-relaxed">
                            Choose how you want to send the prefilled balance reminder.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleShareMethod('sms')}
                            className="rounded-2xl border border-border bg-background/60 p-4 text-left transition-all hover:border-primary/30 hover:bg-accent active:scale-[0.98]"
                        >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-black text-foreground">SMS</p>
                            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Open text message</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleShareMethod('whatsapp')}
                            className="rounded-2xl border border-border bg-background/60 p-4 text-left transition-all hover:border-primary/30 hover:bg-accent active:scale-[0.98]"
                        >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-accent/70 text-primary">
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-black text-foreground">WhatsApp</p>
                            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Open chat message</p>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl surface-card-elevated border-border">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            Add {sharePerson?.name}&apos;s number
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-relaxed">
                            We will save it for future reminders in this lending ledger.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSavePhoneAndShare} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="lending-contact-phone" className="text-[10px] font-bold text-muted-foreground">
                                Mobile number
                            </Label>
                            <Input
                                id="lending-contact-phone"
                                value={phoneInput}
                                onChange={(event) => {
                                    setPhoneInput(event.target.value);
                                    setPhoneError('');
                                }}
                                placeholder="9876543210 or +919876543210"
                                inputMode="tel"
                                autoFocus
                                className="h-11 rounded-full surface-card text-sm"
                            />
                            {phoneError && (
                                <p className="text-[11px] font-semibold text-destructive">{phoneError}</p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPhoneDialogOpen(false)}
                                className="h-11 flex-1 rounded-full"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="outline"
                                className="h-11 flex-1 rounded-xl border-primary/20 bg-card/80 text-primary hover:bg-accent/70"
                            >
                                Save & Share
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

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
