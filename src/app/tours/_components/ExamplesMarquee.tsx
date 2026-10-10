"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { content } from "../_lib/content";
import { showcaseClients, type ShowcaseClient } from "../_lib/site";
import { Marquee } from "./ui/Marquee";
import { TourModal } from "./ui/TourModal";
import { cn } from "@/lib/utils";

export function ExamplesMarquee() {
  const { clientes } = content;
  const [chooserClient, setChooserClient] = useState<ShowcaseClient | null>(null);
  const [activeTour, setActiveTour] = useState<{ url: string; title: string } | null>(null);

  function handleCardClick(client: ShowcaseClient) {
    if (client.tours.length === 1) {
      setActiveTour({ url: client.tours[0].url, title: `${client.nombre} — ${client.tours[0].label}` });
    } else {
      setChooserClient(client);
    }
  }

  return (
    <section id="clientes" className="relative scroll-mt-28 bg-ink py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div data-reveal className="text-center">
          <p className="font-tours-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {clientes.kicker}
          </p>
          <h2
            className="mx-auto mt-4 max-w-2xl font-tours-sans font-semibold tracking-[-0.035em] text-white"
            style={{ fontSize: "clamp(28px, 4.6vw, 48px)", lineHeight: 1.1 }}
          >
            {clientes.title}{" "}
            <span className="font-tours-serif italic text-gold-gradient">{clientes.titleAccent}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body">{clientes.body}</p>
        </div>
      </div>

      <div className="relative mt-12" data-reveal data-reveal-delay="120">
        <Marquee durationSeconds={50}>
          {showcaseClients.map((client) => {
            return (
              <button
                key={client.slug}
                type="button"
                onClick={() => handleCardClick(client)}
                className="group relative mx-2.5 flex h-[22rem] w-64 shrink-0 cursor-pointer flex-col justify-end overflow-hidden rounded-card border border-white/10 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_40px_-15px_rgba(245,197,24,0.25)]"
              >
                <img
                  src={client.poster}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
                <span className="absolute right-3 top-3 rounded-pill border border-white/15 bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  {client.categoriaLabel}
                </span>
                <span className="relative">
                  <p className="font-tours-sans text-[15px] font-semibold leading-snug text-white">{client.nombre}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                    <MapPin className="h-3 w-3" />
                    {client.lugar}
                  </p>
                  <p className="mt-3 text-xs font-medium text-gold transition-colors group-hover:text-gold-hi">
                    {client.tours.length > 1 ? clientes.ctaMultiple : clientes.ctaCategoria} →
                  </p>
                </span>
              </button>
            );
          })}
        </Marquee>
      </div>

      {/* Selector de propiedad para clientes con más de un tour */}
      {chooserClient && !activeTour && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setChooserClient(null)}
        >
          <div
            className="w-full max-w-sm rounded-card border border-hairline-2 bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-tours-sans text-sm font-semibold text-white">{chooserClient.nombre}</p>
              <button
                type="button"
                onClick={() => setChooserClient(null)}
                aria-label="Cerrar"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-hairline-2 text-body hover:border-gold hover:text-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-tours">Elegí la propiedad para entrar al tour</p>
            <div className="mt-4 flex flex-col gap-2">
              {chooserClient.tours.map((tour) => (
                <button
                  key={tour.url + tour.label}
                  type="button"
                  onClick={() =>
                    setActiveTour({ url: tour.url, title: `${chooserClient.nombre} — ${tour.label}` })
                  }
                  className={cn(
                    "cursor-pointer rounded-btn border border-hairline-2 px-4 py-3 text-left text-sm text-body transition-colors",
                    "hover:border-gold/50 hover:text-white"
                  )}
                >
                  {tour.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <TourModal
        open={!!activeTour}
        onClose={() => {
          setActiveTour(null);
          setChooserClient(null);
        }}
        tourUrl={activeTour?.url ?? null}
        title={activeTour?.title ?? ""}
      />
    </section>
  );
}
