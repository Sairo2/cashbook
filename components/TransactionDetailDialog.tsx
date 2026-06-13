'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    Tag,
    CreditCard,
    User,
    Calendar,
    MoreHorizontal,
    Pencil,
    Trash2,
    X
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Transaction, Ledger } from '@/lib/supabase';
import { getCategoryIcon } from '@/lib/category-icons';
import { deleteTransaction, updateTransaction } from '@/lib/store';
import { EditTransactionDialog } from './EditTransactionDialog';

interface TransactionDetailDialogProps {
    transaction: Transaction | null;
    ledger: Ledger;
    isOpen: boolean;
    onClose: () => void;
    onTransactionUpdated: (transaction: Transaction) => void;
    onTransactionDeleted: (transactionId: string) => void;
}

export function TransactionDetailDialog({
    transaction,
    ledger,
    isOpen,
    onClose,
    onTransactionUpdated,
    onTransactionDeleted,
}: TransactionDetailDialogProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    if (!transaction) return null;

    const isCashIn = transaction.type === 'cash_in';
    const categoryIcon = getCategoryIcon(transaction.category);

    const handleDelete = async () => {
        setIsDeleting(true);
        const success = await deleteTransaction(transaction.id);
        if (success) {
            onTransactionDeleted(transaction.id);
            onClose();
        }
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
    };

    const handleEdit = async (data: {
        title: string;
        amount: string;
        category: string;
        payment_mode: string;
        person: string;
    }) => {
        const updated = await updateTransaction(transaction.id, {
            title: data.title,
            amount: parseFloat(data.amount),
            category: data.category,
            payment_mode: data.payment_mode,
            person: data.person,
        });
        if (updated) {
            onTransactionUpdated(updated);
            setIsEditDialogOpen(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl surface-card-elevated border-border p-0 overflow-hidden [&>button]:hidden">
                    {/* Visually hidden title for accessibility */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Transaction Details</DialogTitle>
                    </DialogHeader>

                    {/* Header */}
                    <div className={`px-4 py-5 border-b border-border ${
                        isCashIn ? 'bg-primary/[0.03]' : 'bg-destructive/[0.03]'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                <div className={`p-2.5 rounded-xl shrink-0 border ${
                                    isCashIn 
                                        ? 'bg-primary/10 border-primary/20 text-primary' 
                                        : 'bg-destructive/10 border-destructive/20 text-destructive'
                                }`}>
                                    {React.createElement(categoryIcon, { className: "h-5 w-5" })}
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <h2 className="text-sm font-bold text-foreground truncate tracking-tight">{transaction.title}</h2>
                                    <p className={`text-base font-black tracking-tight ${isCashIn ? 'text-primary' : 'text-destructive'}`}>
                                        {isCashIn ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-2 rounded-xl hover:bg-black/[0.03] active:scale-95 transition-all text-muted-foreground hover:text-foreground" aria-label="Transaction actions">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 surface-card-elevated border-border rounded-xl">
                                        <DropdownMenuItem
                                            onClick={() => setIsEditDialogOpen(true)}
                                            className="cursor-pointer py-2.5 text-sm rounded-lg"
                                        >
                                            <Pencil className="h-4 w-4 mr-2.5 text-muted-foreground" />
                                            Edit Record
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="cursor-pointer py-2.5 text-sm rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2.5" />
                                            Delete Record
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-black/[0.03] active:scale-95 transition-all text-muted-foreground hover:text-foreground"
                                    aria-label="Close details"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="px-4 py-5 space-y-4">
                        <div className="space-y-3">
                            {/* Date Card */}
                            <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                                <div className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground shrink-0">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Date & Time</p>
                                    <p className="text-xs font-bold text-foreground">
                                        {format(new Date(transaction.created_at), 'EEEE, MMM dd, yyyy')}
                                        <span className="text-muted-foreground ml-1.5 font-medium">
                                            {format(new Date(transaction.created_at), 'h:mm a')}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Category Card */}
                            <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                                <div className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground shrink-0">
                                    <Tag className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Category Tag</p>
                                    <p className="text-xs font-bold text-foreground">{transaction.category}</p>
                                </div>
                            </div>

                            {/* Payment Mode Card */}
                            {transaction.payment_mode && (
                                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                                    <div className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground shrink-0">
                                        <CreditCard className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Payment Source</p>
                                        <p className="text-xs font-bold text-foreground">{transaction.payment_mode}</p>
                                    </div>
                                </div>
                            )}

                            {/* Person Card */}
                            {transaction.person && (
                                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-black/[0.01]">
                                    <div className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground shrink-0">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Involved Party</p>
                                        <p className="text-xs font-bold text-foreground">{transaction.person}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl surface-card-elevated border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold">Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Are you sure you want to permanently delete <span className="font-semibold text-foreground">&quot;{transaction.title}&quot;</span>? This will deduct the amount from your ledger balance. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 sm:gap-0 mt-3">
                        <AlertDialogCancel className="flex-1 mt-0 text-xs py-2 rounded-xl bg-muted border-border hover:bg-accent">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs py-2 rounded-xl shadow-md active:scale-98"
                        >
                            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog */}
            <EditTransactionDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                transaction={transaction}
                ledger={ledger}
                onSave={handleEdit}
            />
        </>
    );
}
