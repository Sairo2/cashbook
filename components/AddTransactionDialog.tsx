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
import { Transaction, TransactionType, Ledger } from '@/lib/supabase';

interface AddTransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType;
    ledger: Ledger;
    onAdd: (data: Omit<Transaction, 'id' | 'created_at'>) => void;
}

export function AddTransactionDialog({
    isOpen,
    onClose,
    type,
    ledger,
    onAdd,
}: AddTransactionDialogProps) {
    const form = useForm({
        defaultValues: {
            title: '',
            amount: '',
            category: '',
            payment_mode: '',
            person: '',
        },
    });

    // Reset form when dialog OPENS (not when ledger changes)
    React.useEffect(() => {
        if (isOpen) {
            form.reset({
                title: '',
                amount: '',
                category: '',
                payment_mode: '',
                person: '',
            });
        }
    }, [isOpen, form]);

    const onSubmit = (data: Record<string, string>) => {
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) return; // Guard against NaN/invalid amounts

        onAdd({
            title: data.title,
            amount,
            type,
            category: data.category || 'Other',
            payment_mode: data.payment_mode || undefined,
            person: data.person || undefined,
            ledger_id: ledger.id,
        });
        form.reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] rounded-2xl bg-card border-border surface-card-elevated">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div
                            className={`p-2.5 rounded-xl ${type === 'cash_in'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-destructive/10 text-destructive'
                                }`}
                        >
                            {type === 'cash_in' ? <Plus size={22} /> : <Minus size={22} />}
                        </div>
                        <span className="text-xl">
                            {type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. Grocery, Salary"
                                            {...field}
                                            required
                                            className="h-12 text-base"
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
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            {...field}
                                            required
                                            min="0.01"
                                            step="0.01"
                                            className="h-14 text-2xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-1 focus-visible:ring-primary/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ledger.categories.map((category) => (
                                                    <SelectItem key={category} value={category}>
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
                                    <FormItem>
                                        <FormLabel>Payment Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Select mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ledger.payment_modes.map((mode) => (
                                                    <SelectItem key={mode} value={mode}>
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
                                <FormItem>
                                    <FormLabel>Person (Optional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. Me, John Doe"
                                            {...field}
                                            className="h-12"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2">
                            <Button
                                type="submit"
                                className={`w-full h-14 text-lg font-semibold ${type === 'cash_in'
                                    ? 'cash-in-gradient'
                                    : 'cash-out-gradient'
                                    } hover:opacity-90`}
                            >
                                Save {type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
