"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Play } from "lucide-react";
import { content } from "../_lib/content";
import { waLink } from "../_lib/site";
import { GlassCta } from "./ui/GlassCta";
import { Marquee } from "./ui/Marquee";

const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.MeshGradient),
  { ssr: false }
);

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="absolute inset-0">
        <MeshGradient
          colors={["#0a0a0b", "#1a1305", "#e0a800", "#f5c518", "#0a0a0b"]}
          speed={0.25}
          distortion={0.85}
          swirl={0.55}
          grainMixer={0.3}
          grainOverlay={0.15}
          style={{ width: "100%", height: "100%" }}
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 text-center" data-reveal>
        <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          {content.hero.kicker}
        </p>

        <h1
          className="mx-auto mt-5 max-w-3xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
          style={{ fontSize: "clamp(34px, 6vw, 64px)", lineHeight: 1.06 }}
        >
          {content.hero.titleTop}{" "}
          <span className="font-tours-serif italic text-gold-gradient">{content.hero.titleAccent}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-body sm:text-lg">
          {content.hero.body}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <GlassCta href={waLink(content.whatsappFloat.mensaje)} tone="gold" icon={<ArrowRight className="h-4 w-4" />}>
            {content.hero.ctaPrimary}
          </GlassCta>
          <GlassCta href="#demo" icon={<Play className="h-4 w-4" />}>
            {content.hero.ctaSecondary}
          </GlassCta>
        </div>
      </div>

      <div className="relative mt-14 sm:mt-20" data-reveal data-reveal-delay="150">
        <Marquee durationSeconds={32}>
          {content.hero.features.map((f) => (
            <div
              key={f}
              className="mx-2.5 flex shrink-0 items-center gap-2 rounded-pill border border-hairline-2 bg-surface/70 px-5 py-2.5 backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span className="whitespace-nowrap text-[13px] font-medium text-body">{f}</span>
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
