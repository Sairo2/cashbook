'use client';

import { LogOut, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
    onSignOut: () => void;
}

export function AppHeader({ onSignOut }: AppHeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-30 bg-background/82 backdrop-blur-xl border-b border-border/70">
            <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/18 bg-card/80 text-primary shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
                        <Wallet className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-extrabold truncate max-w-[170px]">
                        CashBook
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSignOut}
                    className="text-muted-foreground hover:text-foreground hover:bg-card rounded-xl h-9 w-9 p-0"
                    aria-label="Sign out"
                >
                    <LogOut className="w-4 h-4" />
                </Button>
            </div>
        </header>
    );
}
