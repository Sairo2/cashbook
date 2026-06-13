"use client"

import React, { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  perspective?: number
  beamSize?: number
  gridColor?: string
}

export const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  perspective = 100,
  className,
  beamSize = 5,
  gridColor = "var(--border)",
  ...props
}) => {
  const sideBaseStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    containerType: "size",
    backgroundSize: `${beamSize}% ${beamSize}%`,
    backgroundImage: `linear-gradient(${gridColor} 0 1px, transparent 1px ${beamSize}%), linear-gradient(90deg, ${gridColor} 0 1px, transparent 1px ${beamSize}%)`,
  }

  return (
    <div className={cn("relative rounded-xl border p-6", className)} {...props}>
      {/* 3D grid tunnel */}
      <div
        style={{
          perspective: `${perspective}px`,
          transformStyle: "preserve-3d",
          clipPath: "inset(0)",
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: "inherit",
        }}
      >
        {/* top side */}
        <div
          style={{
            ...sideBaseStyle,
            zIndex: 20,
            top: 0,
            left: 0,
            transformOrigin: "50% 0%",
            transform: "rotateX(-90deg)",
          }}
        />
        {/* bottom side */}
        <div
          style={{
            ...sideBaseStyle,
            zIndex: 20,
            top: "100%",
            left: 0,
            transformOrigin: "50% 0%",
            transform: "rotateX(-90deg)",
          }}
        />
        {/* left side */}
        <div
          style={{
            ...sideBaseStyle,
            zIndex: 20,
            top: 0,
            left: 0,
            transformOrigin: "0% 0%",
            transform: "rotate(90deg) rotateX(-90deg)",
          }}
        />
        {/* right side */}
        <div
          style={{
            ...sideBaseStyle,
            zIndex: 20,
            top: 0,
            right: 0,
            transformOrigin: "100% 0%",
            transform: "rotate(-90deg) rotateX(-90deg)",
          }}
        />
      </div>

      {/* Content with solid background */}
      <div className="relative z-10 bg-background rounded-lg border p-4">{children}</div>
    </div>
  )
}
