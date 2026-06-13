'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { Send, Link2, Unlink, Copy, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelegramLinkStatus {
    linked: boolean;
    telegram_username?: string;
    linked_at?: string;
}

interface TelegramLinkCardProps {
    className?: string;
    onLinked?: () => void;
}

export function TelegramLinkCard({ className, onLinked }: TelegramLinkCardProps) {
    const [status, setStatus] = React.useState<TelegramLinkStatus | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [linkCode, setLinkCode] = React.useState<string | null>(null);
    const [codeExpiry, setCodeExpiry] = React.useState<number>(0);
    const [copied, setCopied] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState(false);
    const wasLinkedRef = React.useRef(false);

    const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YourCashbookBot';

    const fetchLinkStatus = React.useCallback(async () => {
        try {
            const response = await fetch('/api/telegram/link');
            if (response.ok) {
                const data = await response.json();
                const isLinked = !!data.linked;

                setStatus(data);

                if (isLinked) {
                    setLinkCode(null);
                    setCodeExpiry(0);

                    if (!wasLinkedRef.current) {
                        onLinked?.();
                    }
                }

                wasLinkedRef.current = isLinked;
            }
        } catch (error) {
            console.error('Error fetching Telegram link status:', error);
        } finally {
            setLoading(false);
        }
    }, [onLinked]);

    React.useEffect(() => {
        fetchLinkStatus();
    }, [fetchLinkStatus]);

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

    React.useEffect(() => {
        if (!linkCode || status?.linked) {
            return;
        }

        const timer = setInterval(fetchLinkStatus, 3000);
        return () => clearInterval(timer);
    }, [fetchLinkStatus, linkCode, status?.linked]);

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
            <div className={cn("flex items-center justify-center py-10", className)}>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
        );
    }

    const isLinked = status?.linked;

    return (
        <div className={cn("rounded-2xl border bg-background p-4", className)}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center border",
                    isLinked
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border text-primary"
                )}>
                    <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                        {isLinked ? "Telegram Connected" : "Telegram"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                        {isLinked
                            ? `@${status.telegram_username || 'Telegram'} is live`
                            : "Add lendings from chat"
                        }
                    </p>
                </div>
            </div>

            {isLinked ? (
                // Linked state
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-center bg-primary/10 rounded-full px-3 py-1.5 text-xs font-medium text-primary">
                            gave Alice 500
                        </div>
                        <div className="flex items-center justify-center bg-destructive/10 rounded-full px-3 py-1.5 text-xs font-medium text-destructive">
                            got Bob 250
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={unlinkAccount}
                        disabled={actionLoading}
                        className="w-full h-10 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/10 rounded-full"
                    >
                        {actionLoading ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Unlink className="w-4 h-4 mr-1.5" />
                        )}
                        Disconnect Telegram
                    </Button>
                </div>
            ) : linkCode ? (
                // Code generated state
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-muted border border-border rounded-2xl p-4 text-center space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground leading-none">Connection code</p>
                        <div className="flex items-center justify-center gap-2.5 py-1">
                            <code className="text-[1.65rem] font-black font-mono tracking-widest text-foreground">
                                {linkCode}
                            </code>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyCode}
                                className="h-8 w-8 hover:bg-background rounded-full shrink-0"
                            >
                                {copied ? (
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                ) : (
                                    <Copy className="w-4 h-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        <p className="text-[10px] font-semibold text-muted-foreground">
                            Expires in <span className="font-bold text-primary font-mono">{formatTime(codeExpiry)}</span>
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-10 text-xs font-bold rounded-full bg-muted border-border hover:bg-background"
                        asChild
                    >
                        <a
                            href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${linkCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink className="w-4 h-4 mr-1.5" />
                            Open @{TELEGRAM_BOT_USERNAME}
                        </a>
                    </Button>
                </div>
            ) : (
                // Not linked state
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-5">
                        Generate a short code, send it to your bot, and your lending ledger will stay linked.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-center bg-primary/10 rounded-full px-3 py-1.5 text-xs font-medium text-primary">
                            gave John 500
                        </div>
                        <div className="flex items-center justify-center bg-destructive/10 rounded-full px-3 py-1.5 text-xs font-medium text-destructive">
                            got Mary 1000
                        </div>
                    </div>

                    <Button
                        onClick={generateLinkCode}
                        disabled={actionLoading}
                        className="w-full h-11 text-xs font-bold cash-in-gradient hover:opacity-95 active:scale-98 transition-all rounded-full shadow-md shadow-primary/10"
                    >
                        {actionLoading ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                            <Link2 className="w-4 h-4 mr-1.5 text-primary-foreground" />
                        )}
                        Generate Code
                    </Button>
                </div>
            )}
        </div>
    );
}
