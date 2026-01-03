'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
    ArrowUpCircle,
    ArrowDownCircle,
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
import { Button } from '@/components/ui/button';
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
    const CategoryIconComponent = getCategoryIcon(transaction.category);

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

    const handleEdit = async (data: any) => {
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
                <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl bg-card border-border p-0 overflow-hidden [&>button]:hidden">
                    {/* Visually hidden title for accessibility */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Transaction Details</DialogTitle>
                    </DialogHeader>

                    {/* Header */}
                    <div className="px-4 py-4 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`p-2.5 rounded-xl shrink-0 ${isCashIn ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                                    <CategoryIconComponent className={`h-5 w-5 ${isCashIn ? 'text-emerald-500' : 'text-rose-500'}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-semibold truncate">{transaction.title}</h2>
                                    <p className={`text-lg font-bold ${isCashIn ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isCashIn ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-2 rounded-xl hover:bg-accent/20 transition-colors">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem
                                            onClick={() => setIsEditDialogOpen(true)}
                                            className="cursor-pointer"
                                        >
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-accent/20 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="px-4 py-4 space-y-3">

                        {/* Info Grid */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-lg bg-accent/30">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Date & Time</p>
                                    <p className="font-medium">
                                        {format(new Date(transaction.created_at), 'EEEE, MMM dd, yyyy')}
                                        <span className="text-muted-foreground ml-2">
                                            {format(new Date(transaction.created_at), 'h:mm a')}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-lg bg-accent/30">
                                    <Tag className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Category</p>
                                    <p className="font-medium">{transaction.category}</p>
                                </div>
                            </div>

                            {transaction.payment_mode && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-2 rounded-lg bg-accent/30">
                                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Payment Mode</p>
                                        <p className="font-medium">{transaction.payment_mode}</p>
                                    </div>
                                </div>
                            )}

                            {transaction.person && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-2 rounded-lg bg-accent/30">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Person</p>
                                        <p className="font-medium">{transaction.person}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{transaction.title}"?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
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
