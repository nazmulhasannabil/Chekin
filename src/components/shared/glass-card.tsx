import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "dark" | "solid";
  padding?: "none" | "sm" | "md" | "lg";
}

export function GlassCard({
  className,
  variant = "default",
  padding = "md",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        {
          "glass-card": variant === "default",
          "glass-card-dark": variant === "dark",
          "bg-card border border-border shadow-xl": variant === "solid",
          "p-0": padding === "none",
          "p-4": padding === "sm",
          "p-6": padding === "md",
          "p-8": padding === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
