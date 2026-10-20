import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)} {...p} />;
}
export function CardHeader({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4", className)} {...p} />;
}
export function CardTitle({ className, ...p }: ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold", className)} {...p} />;
}
export function CardDescription({ className, ...p }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...p} />;
}
export function CardContent({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...p} />;
}
