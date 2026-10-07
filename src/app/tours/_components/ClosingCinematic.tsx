"use client";

import { useRef } from "react";
import { ArrowRight, Compass, Link2, ShieldCheck, Smartphone } from "lucide-react";
import { content } from "../_lib/content";
import { waLink } from "../_lib/site";
import { GlassCta } from "./ui/GlassCta";
import { CountUp } from "./ui/CountUp";

const badges = [
  { icon: Link2, label: "Link fijo" },
  { icon: Smartphone, label: "Sin instalar nada" },
  { icon: ShieldCheck, label: "3 meses de hosting sin cargo" },
];

export function ClosingCinematic() {
  const phoneRef = useRef<HTMLDivElement>(null);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = phoneRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
  }

  function onPointerLeave() {
    if (phoneRef.current) phoneRef.current.style.transform = "";
  }

  return (
    <section className="relative overflow-hidden bg-ink py-16 sm:py-24">
      <div className="gold-glow left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 opacity-60" />

      <div
        data-reveal
        className="relative mx-auto grid w-full max-w-5xl items-center gap-10 overflow-hidden rounded-card border border-hairline-2 bg-surface/80 px-6 py-10 backdrop-blur-sm sm:px-10 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8"
      >
        <div>
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {content.closing.kicker}
          </p>
          <h2
            className="mt-4 font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.08 }}
          >
            {content.closing.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{content.closing.titleAccent}</span>
          </h2>
          <p className="mt-5 max-w-md text-body">{content.closing.body}</p>

          <div className="mt-8 flex items-baseline gap-2">
            <CountUp
              value={content.closing.stat.value}
              suffix={content.closing.stat.suffix}
              className="font-tours-sans text-4xl font-bold text-white"
            />
            <span className="text-sm text-muted-tours">{content.closing.stat.label}</span>
          </div>

          <ul className="mt-6 flex flex-col items-start gap-2">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <li
                  key={badge.label}
                  className="inline-flex items-center gap-2 rounded-pill border border-hairline-2 bg-ink/70 px-3.5 py-2 text-[13px] font-medium text-white"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
                  {badge.label}
                </li>
              );
            })}
          </ul>

          <div className="mt-8">
            <GlassCta href={waLink(content.whatsappFloat.mensaje)} tone="gold" icon={<ArrowRight className="h-4 w-4" />}>
              {content.closing.ctaPrimary}
            </GlassCta>
          </div>
        </div>

        <div
          className="relative hidden justify-center py-4 sm:flex"
          style={{ perspective: "1000px" }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <div
            ref={phoneRef}
            className="relative h-[340px] w-[170px] rounded-[2.25rem] border-4 border-hairline-2 bg-ink shadow-2xl transition-transform duration-200 ease-out sm:h-[400px] sm:w-[200px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-hairline-2" />
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-surface via-ink to-surface">
              <Compass className="h-9 w-9 text-gold/70" />
              <span className="absolute left-[30%] top-[35%] h-2 w-2 animate-pulse rounded-full bg-gold" />
              <span className="absolute right-[26%] bottom-[32%] h-2 w-2 animate-pulse rounded-full bg-gold" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
