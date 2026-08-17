"use client";

import { useState } from "react";
import { Play, ExternalLink, Volume2 } from "lucide-react";
import { content } from "../_lib/content";
import { demoTour } from "../_lib/site";

export function DemoSection() {
  const [started, setStarted] = useState(false);

  return (
    <section id="demo" className="relative bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div data-reveal className="text-center">
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {content.demo.kicker}
          </p>
          <h2
            className="mx-auto mt-4 max-w-2xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.1 }}
          >
            {content.demo.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{content.demo.titleAccent}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body">{content.demo.body}</p>
        </div>

        <div
          data-reveal
          data-reveal-delay="120"
          className="relative mt-10 overflow-hidden rounded-card border border-hairline-2 bg-surface"
        >
          <div className="relative aspect-[16/10] w-full sm:aspect-[16/8]">
            {started ? (
              <iframe
                src={demoTour.url}
                title="Tour virtual 360 de ejemplo"
                loading="eager"
                allow="xr-spatial-tracking; gyroscope; accelerometer"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 bg-gradient-to-br from-surface via-ink to-surface"
              >
                <div className="gold-glow left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold text-ink shadow-[0_0_40px_rgba(245,197,24,0.45)] transition-transform group-hover:scale-105">
                  <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
                </span>
                <span className="relative font-tours-sans text-sm font-semibold text-white">
                  Tocá para explorar el tour
                </span>
                <span className="relative flex items-center gap-1.5 text-xs text-muted-tours">
                  <Volume2 className="h-3.5 w-3.5" />
                  {content.demo.muteNote}
                </span>
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted-tours">
          {content.demo.fallback}{" "}
          <a
            href={demoTour.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold underline-offset-4 hover:underline"
          >
            {content.demo.fallbackLink}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </section>
  );
}
