import { Check, X, RotateCw } from "lucide-react";
import { content } from "../_lib/content";
import { FlipCard } from "./ui/FlipCard";

export function FeaturesSection() {
  const { features } = content;

  return (
    <section className="relative bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div data-reveal className="text-center">
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {features.kicker}
          </p>
          <h2
            className="mx-auto mt-4 max-w-2xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.1 }}
          >
            {features.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{features.titleAccent}</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.incluye.items.map((item, i) => (
            <div key={item.titulo} data-reveal data-reveal-delay={String(i * 90)} className="h-64">
              <FlipCard
                front={
                  <div className="flex h-full flex-col rounded-card border border-hairline-2 bg-surface p-6 transition-colors group-hover:border-gold/40">
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
                        <Check className="h-5 w-5 text-success" />
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-tours">
                        <RotateCw className="h-3.5 w-3.5" />
                        Ver detalle
                      </span>
                    </div>
                    <div className="mt-6">
                      <p className="font-tours-sans text-base font-semibold text-white">{item.titulo}</p>
                      <p className="mt-2 text-sm leading-relaxed text-body">{item.resumen}</p>
                    </div>
                  </div>
                }
                back={
                  <div className="flex h-full flex-col rounded-card border border-gold/40 bg-surface p-6">
                    <p className="font-tours-sans text-sm font-semibold text-gold">{item.titulo}</p>
                    <p className="mt-3 flex-1 overflow-y-auto text-sm leading-relaxed text-body">{item.detalle}</p>
                    <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-tours">
                      <RotateCw className="h-3.5 w-3.5" />
                      Tocá para volver
                    </span>
                  </div>
                }
              />
            </div>
          ))}
        </div>

        <div data-reveal className="mt-6 rounded-card border border-hairline bg-surface/40 p-6 sm:p-8">
          <p className="font-tours-sans text-sm font-semibold text-white">{features.noIncluye.label}</p>
          <ul className="mt-4 space-y-3">
            {features.noIncluye.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-tours" />
                <span className="text-sm leading-relaxed text-pretty text-body">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-muted-tours">{features.noIncluye.nota}</p>
        </div>
      </div>
    </section>
  );
}
