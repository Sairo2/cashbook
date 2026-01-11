'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Send, Link2, Unlink, Copy, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelegramLinkStatus {
    linked: boolean;
    telegram_username?: string;
    linked_at?: string;
}

interface TelegramLinkCardProps {
    className?: string;
}

export function TelegramLinkCard({ className }: TelegramLinkCardProps) {
    const [status, setStatus] = React.useState<TelegramLinkStatus | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [linkCode, setLinkCode] = React.useState<string | null>(null);
    const [codeExpiry, setCodeExpiry] = React.useState<number>(0);
    const [copied, setCopied] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState(false);

    const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YourCashbookBot';

    // Fetch link status on mount
    React.useEffect(() => {
        fetchLinkStatus();
    }, []);

    // Countdown timer for code expiry
    React.useEffect(() => {
        if (codeExpiry > 0) {
            const timer = setInterval(() => {
                setCodeExpiry((prev) => {
                    if (prev <= 1) {
                        setLinkCode(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [codeExpiry]);

    const fetchLinkStatus = async () => {
        try {
            const response = await fetch('/api/telegram/link');
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Error fetching Telegram link status:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateLinkCode = async () => {
        setActionLoading(true);
        try {
            const response = await fetch('/api/telegram/link', { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                setLinkCode(data.code);
                setCodeExpiry(data.expires_in);
            } else {
                const error = await response.json();
                console.error('Error generating link code:', error);
            }
        } catch (error) {
            console.error('Error generating link code:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const unlinkAccount = async () => {
        if (!confirm('Are you sure you want to unlink your Telegram account?')) {
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch('/api/telegram/link', { method: 'DELETE' });
            if (response.ok) {
                setStatus({ linked: false });
                setLinkCode(null);
            }
        } catch (error) {
            console.error('Error unlinking account:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const copyCode = () => {
        if (linkCode) {
            navigator.clipboard.writeText(`/start ${linkCode}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <Card className={cn("border-border/50", className)}>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn(
            "border overflow-hidden",
            status?.linked
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border",
            className
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    {/* <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        status?.linked
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                            : "bg-gradient-to-br from-blue-500 to-indigo-600"
                    )}>
                        
                    </div> */}
                    <Send className="w-5 h-5 text-emerald-500" />
                    <div>
                        <CardTitle className="text-base">Telegram Bot</CardTitle>
                        <CardDescription className="text-xs">
                            {status?.linked
                                ? 'Connected'
                                : 'Link to add lendings via Telegram'}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {status?.linked ? (
                    // Linked state
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-muted-foreground">Linked to</span>
                            <span className="font-medium text-foreground">
                                @{status.telegram_username || 'Telegram'}
                            </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Send: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">gave john 500</code> or <code className="bg-muted px-1 py-0.5 rounded text-[10px]">got john 500</code>
                        </p>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={unlinkAccount}
                            disabled={actionLoading}
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                        >
                            {actionLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Unlink className="w-4 h-4 mr-2" />
                            )}
                            Unlink Account
                        </Button>
                    </div>
                ) : linkCode ? (
                    // Code generated state
                    <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
                            <p className="text-xs text-muted-foreground">Your link code</p>
                            <div className="flex items-center justify-center gap-2">
                                <code className="text-2xl font-mono font-bold tracking-wider text-primary">
                                    {linkCode}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyCode}
                                    className="h-8 w-8 p-0"
                                >
                                    {copied ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Expires in <span className="font-medium text-amber-500">{formatTime(codeExpiry)}</span>
                            </p>
                        </div>

                        <div className="space-y-2 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">Steps to link:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Open Telegram and search for <span className="font-medium">@{TELEGRAM_BOT_USERNAME}</span></li>
                                <li>Send <code className="bg-muted px-1 py-0.5 rounded text-[10px]">/start {linkCode}</code></li>
                                <li>You&apos;ll receive a confirmation message</li>
                            </ol>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                        >
                            <a
                                href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${linkCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open in Telegram
                            </a>
                        </Button>
                    </div>
                ) : (
                    // Not linked state
                    <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                            Link your Telegram account to quickly record lendings by sending messages like:
                        </p>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                            <code className="text-xs block">gave john 500 tomorrow</code>
                            <code className="text-xs block text-muted-foreground">got mary 1000</code>
                        </div>

                        <Button
                            onClick={generateLinkCode}
                            disabled={actionLoading}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        >
                            {actionLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Link2 className="w-4 h-4 mr-2" />
                            )}
                            Generate Link Code
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
