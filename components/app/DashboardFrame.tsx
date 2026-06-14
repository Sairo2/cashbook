'use client';

import * as React from 'react';

interface DashboardFrameProps {
    children: React.ReactNode;
}

export function DashboardFrame({ children }: DashboardFrameProps) {
    return (
        <div className="page-enter mx-auto min-h-dvh w-full max-w-[480px]">
            {children}
        </div>
    );
}
