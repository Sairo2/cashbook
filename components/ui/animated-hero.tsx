'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
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

    React.useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setTitleNumber((current) => (current + 1) % rotatingWords.length);
        }, 1900);

        return () => window.clearTimeout(timeoutId);
    }, [titleNumber]);

    return (
        <section className={cn('relative flex min-h-dvh flex-col justify-center px-6 pb-8 pt-20 lg:min-h-0 lg:px-0 lg:py-0', className)}>
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto flex w-full max-w-[25rem] flex-col items-center text-center lg:mx-0 lg:max-w-[34rem] lg:items-start lg:text-left"
            >
                <h1 className="font-display text-[3.75rem] leading-[0.9] text-foreground sm:text-[4.35rem] lg:text-[5.4rem]">
                    Your quiet book for
                    <span className="relative mt-2 flex h-[4.1rem] w-full items-center justify-center overflow-hidden text-primary sm:h-[4.7rem] lg:h-[5.9rem] lg:justify-start">
                        {rotatingWords.map((title, index) => (
                            <motion.span
                                key={title}
                                className="absolute font-display"
                                initial={{ opacity: 0, y: 56, filter: 'blur(8px)' }}
                                animate={
                                    titleNumber === index
                                        ? { y: 0, opacity: 1, filter: 'blur(0px)' }
                                        : {
                                            y: titleNumber > index ? -58 : 58,
                                            opacity: 0,
                                            filter: 'blur(8px)',
                                        }
                                }
                                transition={{ type: 'spring', stiffness: 70, damping: 18 }}
                            >
                                {title}
                            </motion.span>
                        ))}
                    </span>
                </h1>

                <p className="mt-5 max-w-[21rem] text-[0.95rem] leading-6 text-muted-foreground lg:max-w-[30rem] lg:text-base lg:leading-7">
                    Track daily cash, settle lending balances, and add Telegram entries without turning money into admin work.
                </p>

                <div className="mt-8 flex w-full flex-col gap-3 lg:max-w-[25rem]">
                    <Button
                        onClick={onPrimaryAction}
                        disabled={isLoading}
                        className="h-13 w-full rounded-full bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                        ) : (
                            primaryIcon ?? <ArrowRight className="h-4 w-4" />
                        )}
                        {isLoading ? loadingLabel : primaryLabel}
                    </Button>

                    <div className="grid grid-cols-3 gap-2 text-center">
                        {['Cash in/out', 'PDF exports', 'WhatsApp share'].map((item) => (
                            <div
                                key={item}
                                className="rounded-full border border-border bg-card/45 px-2 py-2 text-[10px] font-extrabold text-muted-foreground backdrop-blur"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
