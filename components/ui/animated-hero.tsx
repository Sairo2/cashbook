'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedHeroProps {
    className?: string;
    isLoading?: boolean;
    onPrimaryAction?: () => void;
    primaryLabel?: string;
    loadingLabel?: string;
    primaryIcon?: React.ReactNode;
}

const rotatingWords = ['lendings', 'expenses', 'settlements', 'cashflow'];

export function AnimatedHero({
    className,
    isLoading = false,
    onPrimaryAction,
    primaryLabel = 'Continue',
    loadingLabel = 'Connecting...',
    primaryIcon,
}: AnimatedHeroProps) {
    const [titleNumber, setTitleNumber] = React.useState(0);
    const activeWord = rotatingWords[titleNumber];

    React.useEffect(() => {
        const intervalId = window.setInterval(() => {
            setTitleNumber((current) => (current + 1) % rotatingWords.length);
        }, 1900);

        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <section className={cn('relative flex min-h-dvh flex-col justify-center px-6 pb-8 pt-20 lg:min-h-0 lg:px-0 lg:py-0', className)}>
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto flex w-full max-w-[25rem] flex-col items-center text-center lg:mx-0 lg:max-w-[34rem] lg:items-start lg:text-left"
            >
                <h1 className="font-display text-[3.75rem] leading-[0.96] text-foreground sm:text-[4.35rem] lg:text-[5.4rem]">
                    Your quiet book for
                    <span className="relative mt-2 flex h-[1.18em] w-full items-center justify-center overflow-hidden pb-[0.08em] pt-[0.04em] text-primary lg:justify-start">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={activeWord}
                                className="absolute inset-x-0 font-display leading-[0.98] will-change-transform lg:inset-x-auto"
                                initial={{ opacity: 0, y: '72%', filter: 'blur(8px)' }}
                                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: '-72%', filter: 'blur(8px)' }}
                                transition={{ type: 'spring', stiffness: 82, damping: 20, mass: 0.85 }}
                            >
                                {activeWord}
                            </motion.span>
                        </AnimatePresence>
                    </span>
                </h1>

                <p className="mt-5 max-w-[21rem] text-[0.95rem] leading-6 text-muted-foreground lg:max-w-[30rem] lg:text-base lg:leading-7">
                    Track daily cash, settle lending balances, and add Telegram entries without turning money into admin work.
                </p>

                <div className="mt-8 flex w-full flex-col gap-3 lg:max-w-[25rem]">
                    <Button
                        onClick={onPrimaryAction}
                        disabled={isLoading}
                        variant="outline"
                        className="h-13 w-full rounded-xl border-primary/20 bg-card/80 text-primary hover:bg-accent/70 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                        ) : (
                            primaryIcon ?? <ArrowRight className="h-4 w-4" />
                        )}
                        {isLoading ? loadingLabel : primaryLabel}
                    </Button>

                 
                </div>
            </motion.div>
        </section>
    );
}
