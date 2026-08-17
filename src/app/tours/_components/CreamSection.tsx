import { Check, Compass, Link2 } from "lucide-react";
import { content } from "../_lib/content";
import { site } from "../_lib/site";

export function CreamSection() {
  const { cream } = content;

  return (
    <section className="relative bg-ink">
      <div className="relative bg-cream py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink to-transparent" />

        <div className="mx-auto grid max-w-5xl items-center gap-12 px-5 lg:grid-cols-2">
          <div data-reveal>
            <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-cream-muted">
              {cream.kicker}
            </p>
            <h2
              className="mt-4 font-tours-sans font-semibold tracking-[-0.035em] text-cream-ink"
              style={{ fontSize: "clamp(28px, 4.2vw, 44px)", lineHeight: 1.1 }}
            >
              {cream.title}{" "}
              <span className="font-tours-serif italic text-cream-ink/80">{cream.titleAccent}</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-cream-body">{cream.body}</p>

            <ul className="mt-7 space-y-3.5">
              {cream.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-sm leading-relaxed text-cream-body">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal data-reveal-delay="150" className="relative">
            {/* Ilustrativo — no es una captura real del producto. */}
            <div className="overflow-hidden rounded-card border border-cream-border bg-cream-card shadow-[0_30px_60px_-20px_rgba(20,20,23,0.25)]">
              <div className="flex items-center gap-2 border-b border-cream-border px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-cream-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-cream-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-cream-border" />
                <span className="ml-2 flex flex-1 items-center gap-1.5 truncate rounded-pill bg-cream px-3 py-1 text-[11px] text-cream-muted">
                  <Link2 className="h-3 w-3 shrink-0" />
                  {site.url.replace("https://", "")}/…
                </span>
              </div>
              <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-ink via-surface to-ink">
                <div className="gold-glow left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2" />
                <div className="relative flex flex-col items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/15">
                    <Compass className="h-6 w-6 text-gold" />
                  </span>
                  <span className="font-tours-serif text-sm italic text-white/70">recorrido 360°</span>
                </div>
                <span className="absolute left-[28%] top-[38%] h-2.5 w-2.5 animate-pulse rounded-full bg-gold shadow-[0_0_0_5px_rgba(245,197,24,0.25)]" />
                <span className="absolute right-[22%] bottom-[30%] h-2.5 w-2.5 animate-pulse rounded-full bg-gold shadow-[0_0_0_5px_rgba(245,197,24,0.25)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
