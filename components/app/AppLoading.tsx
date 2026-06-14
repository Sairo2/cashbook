'use client';

export function AppLoading() {
    return (
        <div className="min-h-screen min-h-dvh flex items-center justify-center">
            <div className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">Loading CashBook...</p>
            </div>
        </div>
    );
}
