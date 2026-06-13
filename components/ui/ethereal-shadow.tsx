'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EtherealShadowProps {
    className?: string;
}

const shadowFields = [
    'left-[6%] top-[7%] h-52 w-52 bg-[#f7c8a6]/45',
    'right-[-8%] top-[12%] h-64 w-64 bg-[#bdebd5]/55',
    'left-[28%] bottom-[18%] h-72 w-72 bg-[#f8dfb2]/55',
    'right-[10%] bottom-[-10%] h-56 w-56 bg-[#f2b9b2]/35',
];

export function EtherealShadow({ className }: EtherealShadowProps) {
    return (
        <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,253,248,0.98),rgba(246,242,234,0.48)_45%,rgba(246,242,234,0.98)_100%)]" />

            {shadowFields.map((field, index) => (
                <motion.div
                    key={field}
                    className={cn('absolute rounded-full blur-[58px]', field)}
                    initial={{ opacity: 0.55, scale: 0.96, x: 0, y: 0 }}
                    animate={{
                        opacity: [0.44, 0.72, 0.5],
                        scale: [0.96, 1.08, 0.98],
                        x: index % 2 === 0 ? [0, 18, -8, 0] : [0, -14, 10, 0],
                        y: index % 2 === 0 ? [0, -12, 8, 0] : [0, 14, -10, 0],
                    }}
                    transition={{
                        duration: 10 + index * 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}

            <svg className="absolute inset-0 h-full w-full opacity-[0.18] mix-blend-multiply">
                <filter id="cashbook-warm-noise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#cashbook-warm-noise)" />
            </svg>

            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
    );
}
