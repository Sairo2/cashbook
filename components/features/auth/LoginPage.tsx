'use client';

import * as React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Send } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import { AnimatedHero } from '@/components/ui/animated-hero';
import { EtherealShadow } from '@/components/ui/ethereal-shadow';

function GoogleMark() {
    return (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
    );
}

export function LoginPage() {
    const [isLoading, setIsLoading] = React.useState(false);
    const [signInError, setSignInError] = React.useState('');

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setSignInError('');

        const safetyTimer = window.setTimeout(() => {
            setIsLoading(false);
        }, 8000);

        try {
            const origin = window.location.origin;
            const result = await signIn.social({
                provider: 'google',
                callbackURL: `${origin}/`,
                errorCallbackURL: `${origin}/`,
                disableRedirect: true,
            } as Parameters<typeof signIn.social>[0] & { disableRedirect: boolean });

            if (result?.error) {
                throw new Error(result.error.message || 'Google sign-in failed.');
            }

            if (result?.data?.url) {
                window.location.assign(result.data.url);
                return;
            }

            throw new Error('Google did not return a sign-in URL.');
        } catch (error) {
            console.error('Sign in error:', error);
            setIsLoading(false);
            window.clearTimeout(safetyTimer);
            setSignInError(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.');
        }
    };

    return (
        <div className="relative min-h-screen min-h-dvh overflow-hidden">
            <EtherealShadow />

            <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:gap-16 lg:px-8">
                <AnimatedHero
                    className="pb-48 pt-10 lg:pb-0 lg:pt-0"
                    isLoading={isLoading}
                    onPrimaryAction={handleGoogleSignIn}
                    primaryLabel="Continue with Google"
                    loadingLabel="Opening Google..."
                    primaryIcon={<GoogleMark />}
                    errorMessage={signInError}
                />

                <div className="hidden lg:pointer-events-auto lg:static lg:mx-0 lg:block lg:max-w-none">
                    <div className="surface-card-elevated rounded-[1.45rem] p-3 backdrop-blur-xl lg:p-4">
                        <div className="mb-3 flex items-center justify-between px-1 lg:mb-5">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground">Today</p>
                                <p className="text-sm font-black text-foreground lg:text-base">Lending snapshot</p>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-accent/70 text-primary lg:h-11 lg:w-11">
                                <Send className="h-4 w-4 lg:h-5 lg:w-5" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 lg:gap-3">
                            <div className="rounded-2xl border border-primary/15 bg-[#e7f5ec]/75 p-3 lg:p-4">
                                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-primary">
                                    <ArrowUpCircle className="h-3.5 w-3.5" />
                                    They owe
                                </div>
                                <p className="text-lg font-black text-primary lg:text-2xl">Rs 8,400</p>
                            </div>
                            <div className="rounded-2xl border border-destructive/15 bg-[#fae4df]/70 p-3 lg:p-4">
                                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-destructive">
                                    <ArrowDownCircle className="h-3.5 w-3.5" />
                                    You owe
                                </div>
                                <p className="text-lg font-black text-destructive lg:text-2xl">Rs 1,250</p>
                            </div>
                        </div>

                        <div className="mt-3 space-y-2 lg:mt-4">
                            {[
                                ['Sumant', '+Rs 3,200', 'WhatsApp reminder ready'],
                                ['Aisha', '+Rs 1,800', 'SMS saved'],
                                ['Rahul', 'settled', 'Balance closed'],
                            ].map(([name, amount, note]) => (
                                <div key={name} className="flex items-center justify-between rounded-2xl border border-border bg-card/50 px-3 py-2.5">
                                    <div>
                                        <p className="text-xs font-black text-foreground">{name}</p>
                                        <p className="text-[10px] text-muted-foreground">{note}</p>
                                    </div>
                                    <p className="text-xs font-black text-primary">{amount}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 rounded-2xl border border-border bg-background/50 p-3 lg:mt-4">
                            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                <span>Telegram entries</span>
                                <span>12 this week</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                                <div className="h-full w-[72%] rounded-full bg-primary" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
