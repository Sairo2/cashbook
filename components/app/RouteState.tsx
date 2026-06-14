'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface RouteStateProps {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    children?: ReactNode;
}

export function RouteState({
    title,
    description,
    actionLabel,
    onAction,
    children,
}: RouteStateProps) {
    return (
        <div className="min-h-dvh px-4 py-16 flex items-center justify-center">
            <div className="w-full max-w-[360px] text-center">
                {children}
                <h1 className="font-display text-3xl leading-none text-foreground">
                    {title}
                </h1>
                {description && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {description}
                    </p>
                )}
                {actionLabel && onAction && (
                    <Button
                        onClick={onAction}
                        variant="outline"
                        className="mt-6 rounded-xl border-primary/20 bg-card/80 px-5 text-primary hover:bg-accent/70"
                    >
                        {actionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}
