"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type FlipCardProps = {
  front: ReactNode;
  back: ReactNode;
  className?: string;
};

export function FlipCard({ front, back, className }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      aria-pressed={flipped}
      className={cn(
        "flip-card group h-full w-full cursor-pointer text-left",
        flipped && "is-flipped",
        className
      )}
    >
      <div className="flip-card-inner h-full w-full">
        <div className="flip-card-face flip-card-face--front">{front}</div>
        <div className="flip-card-face flip-card-face--back">{back}</div>
      </div>
    </button>
  );
}
