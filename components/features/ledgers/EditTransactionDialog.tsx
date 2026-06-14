'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Minus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Transaction, Ledger } from '@/lib/supabase';

interface EditTransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    ledger: Ledger;
    onSave: (data: {
        title: string;
        amount: string;
        category: string;
        payment_mode: string;
        person: string;
    }) => void;
}

export function EditTransactionDialog({
    isOpen,
    onClose,
    transaction,
    ledger,
    onSave,
}: EditTransactionDialogProps) {
    const form = useForm({
        defaultValues: {
            title: transaction.title,
            amount: transaction.amount.toString(),
            category: transaction.category,
            payment_mode: transaction.payment_mode || ledger.payment_modes[0] || 'Cash',
            person: transaction.person || '',
        },
    });

    // Reset form when transaction changes
    React.useEffect(() => {
        if (transaction) {
            form.reset({
                title: transaction.title,
                amount: transaction.amount.toString(),
                category: transaction.category,
                payment_mode: transaction.payment_mode || ledger.payment_modes[0] || 'Cash',
                person: transaction.person || '',
            });
        }
    }, [transaction, form, ledger]);

    const onSubmit = (data: {
        title: string;
        amount: string;
        category: string;
        payment_mode: string;
        person: string;
    }) => {
        onSave(data);
    };

    const isCashIn = transaction.type === 'cash_in';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto surface-card-elevated border-border rounded-2xl p-5 gap-0">
                <DialogHeader className={`p-4 rounded-xl border mb-5 ${
                    isCashIn 
                        ? 'bg-primary/[0.05] border-primary/20' 
                        : 'bg-destructive/[0.05] border-destructive/20'
                }`}>
                    <DialogTitle className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${
                            isCashIn 
                                ? 'bg-primary/10 border-primary/20 text-primary' 
                                : 'bg-destructive/10 border-destructive/20 text-destructive'
                        }`}>
                            {isCashIn ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-sm font-bold tracking-tight text-foreground uppercase">
                                Edit {isCashIn ? 'Cash In' : 'Cash Out'}
                            </span>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Update transaction details
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Groceries, Salary, Dinner"
                                            {...field}
                                            required
                                            className="text-xs h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl font-medium"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount *</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                {...field}
                                                required
                                                className="pl-8 text-base font-black h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="text-xs h-11 surface-card border border-border focus:ring-1 focus:ring-primary/45 rounded-xl font-medium">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="surface-card-elevated border-border rounded-xl">
                                                {ledger.categories.map((category) => (
                                                    <SelectItem key={category} value={category} className="text-xs font-medium py-2 rounded-lg cursor-pointer">
                                                        {category}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="payment_mode"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="text-xs h-11 surface-card border border-border focus:ring-1 focus:ring-primary/45 rounded-xl font-medium">
                                                    <SelectValue placeholder="Select mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="surface-card-elevated border-border rounded-xl">
                                                {ledger.payment_modes.map((mode) => (
                                                    <SelectItem key={mode} value={mode} className="text-xs font-medium py-2 rounded-lg cursor-pointer">
                                                        {mode}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="person"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Person <span className="text-muted-foreground/60 text-[9px] font-semibold">(optional)</span></FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. John Doe, Me"
                                            {...field}
                                            className="text-xs h-11 surface-card border border-border focus-visible:ring-1 focus-visible:ring-primary/45 rounded-xl font-medium"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2 flex gap-3 sm:gap-0 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 h-11 text-xs font-bold uppercase tracking-wider rounded-xl bg-muted border-border hover:bg-accent"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className={`flex-1 h-11 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md active:scale-98 transition-all sm:ml-2 ${
                                    isCashIn
                                        ? 'cash-in-gradient hover:opacity-95 shadow-primary/10'
                                        : 'cash-out-gradient hover:opacity-95 shadow-destructive/10'
                                }`}
                            >
                                Update Record
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
