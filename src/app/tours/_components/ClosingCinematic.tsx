"use client";

import { useEffect, useRef } from "react";
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
  const pinRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top top",
            end: "+=2200",
            scrub: 1,
            pin: true,
          },
        });

        tl.fromTo(cardRef.current, { scale: 0.88, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: "power2.out" })
          .fromTo(
            badgeRefs.current.filter(Boolean),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, stagger: 0.18, duration: 0.6, ease: "power2.out" },
            "-=0.5"
          );
      }, pinRef);
    })();

    return () => ctx?.revert();
  }, []);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = phoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 14}deg)`;
  }

  function onPointerLeave() {
    if (phoneRef.current) phoneRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  }

  return (
    <section ref={pinRef} className="relative flex min-h-screen items-center overflow-hidden bg-ink py-16">
      <div className="gold-glow left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2" />

      <div
        ref={cardRef}
        className="relative mx-auto grid w-full max-w-5xl items-center gap-12 rounded-card border border-hairline-2 bg-surface/70 px-6 py-14 backdrop-blur-sm sm:px-12 lg:grid-cols-[1.1fr_0.9fr]"
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

          <div className="mt-8">
            <GlassCta href={waLink(content.whatsappFloat.mensaje)} tone="gold" icon={<ArrowRight className="h-4 w-4" />}>
              {content.closing.ctaPrimary}
            </GlassCta>
          </div>
        </div>

        <div
          className="relative flex justify-center py-6"
          style={{ perspective: "1000px" }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <div
            ref={phoneRef}
            className="relative h-[380px] w-[190px] rounded-[2.25rem] border-4 border-hairline-2 bg-ink shadow-2xl transition-transform duration-200 ease-out sm:h-[420px] sm:w-[210px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-hairline-2" />
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-surface via-ink to-surface">
              <Compass className="h-9 w-9 text-gold/70" />
              <span className="absolute left-[30%] top-[35%] h-2 w-2 animate-pulse rounded-full bg-gold" />
              <span className="absolute right-[26%] bottom-[32%] h-2 w-2 animate-pulse rounded-full bg-gold" />
            </div>

            {badges.map((badge, i) => {
              const Icon = badge.icon;
              const positions = [
                "-left-16 top-6",
                "-right-20 top-1/2 -translate-y-1/2",
                "-left-12 bottom-10",
              ];
              return (
                <div
                  key={badge.label}
                  ref={(el) => {
                    badgeRefs.current[i] = el;
                  }}
                  className={`glass-cta !absolute !flex !gap-1.5 !px-3.5 !py-2 !text-[11px] !font-semibold ${positions[i]}`}
                  style={{ transform: "translateZ(40px)" }}
                >
                  <Icon className="h-3.5 w-3.5 text-gold" />
                  {badge.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
