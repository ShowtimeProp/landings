import { cn } from "@/lib/utils";

export function GoldGlow({ className }: { className?: string }) {
  return <div aria-hidden className={cn("gold-glow", className)} />;
}
