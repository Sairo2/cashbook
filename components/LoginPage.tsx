'use client';

import * as React from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { signIn } from '@/lib/auth-client';

export function LoginPage() {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signIn.social({
                provider: "google",
                callbackURL: "/",
            });
        } catch (error) {
            console.error("Sign in error:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-primary/8 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-destructive/8 blur-[120px] rounded-full" />
            </div>

            {/* Logo & Branding */}
            <div className="text-center mb-10 animate-fade-in">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/10">
                    <Wallet className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                    CashBook
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Track expenses with elegance
                </p>
            </div>

            {/* Login Card */}
            <Card className="w-full glass-card border-none animate-slide-up">
                <CardContent className="p-6 space-y-6">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold mb-1">Welcome</h2>
                        <p className="text-sm text-muted-foreground">
                            Sign in to access your ledgers
                        </p>
                    </div>

                    <Button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full h-14 text-base font-medium bg-white hover:bg-gray-100 text-gray-900 shadow-lg transition-all active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-3" />
                        ) : (
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
                        )}
                        {isLoading ? 'Signing in...' : 'Continue with Google'}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        By signing in, you agree to our Terms of Service
                    </p>
                </CardContent>
            </Card>

            {/* Footer */}
            <p className="text-xs text-muted-foreground mt-8">
                Your data is stored securely
            </p>
        </div>
    );
}
