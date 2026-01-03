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
import { TransactionType, Ledger } from '@/lib/supabase';

interface AddTransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType;
    ledger: Ledger;
    onAdd: (data: any) => void;
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
            category: ledger.categories[0] || 'Other',
            payment_mode: ledger.payment_modes[0] || 'Cash',
            person: '',
        },
    });

    React.useEffect(() => {
        // Reset form with ledger-specific defaults when ledger changes
        form.reset({
            title: '',
            amount: '',
            category: ledger.categories[0] || 'Other',
            payment_mode: ledger.payment_modes[0] || 'Cash',
            person: '',
        });
    }, [ledger, form]);

    const onSubmit = (data: any) => {
        onAdd({
            ...data,
            amount: parseFloat(data.amount),
            type,
            ledger_id: ledger.id,
        });
        form.reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] rounded-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div
                            className={`p-2.5 rounded-xl ${type === 'cash_in'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-rose-500/10 text-rose-500'
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
                                    <FormLabel>Amount (₹)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            {...field}
                                            required
                                            className="h-14 text-2xl font-bold"
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
