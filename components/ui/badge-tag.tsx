"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeTagProps {
  label: string;
  active?: boolean;
  className?: string;
}

export function BadgeTag({ label, active = false, className }: BadgeTagProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border rounded-full px-3 py-1 text-[10px] font-bold",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-gray-500/30 bg-gray-500/10 text-gray-800",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-3 py-1 text-[10px] font-bold",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-white border border-gray-500/30"
        )}
      >
        {active ? "Live" : "Off"}
      </div>
      <span className="pr-2">{label}</span>
    </div>
  );
}

export default BadgeTag;
