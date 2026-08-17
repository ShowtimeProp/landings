import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
  durationSeconds?: number;
  reverse?: boolean;
};

export function Marquee({ children, className, durationSeconds = 44, reverse = false }: MarqueeProps) {
  return (
    <div className={cn("marquee-mask", className)}>
      <div
        className="marquee-track"
        style={{
          // @ts-expect-error CSS custom property
          "--marquee-duration": `${durationSeconds}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
        <div aria-hidden className="flex shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
}
