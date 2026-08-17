import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type GlassCtaProps = {
  href: string;
  children: ReactNode;
  tone?: "default" | "gold";
  target?: string;
  rel?: string;
  className?: string;
  icon?: ReactNode;
};

export function GlassCta({ href, children, tone = "default", target, rel, className, icon }: GlassCtaProps) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={cn("glass-cta", tone === "gold" && "glass-cta--gold", className)}
    >
      {children}
      {icon}
    </a>
  );
}
