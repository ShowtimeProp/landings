'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type PortfolioTheme = 'dark' | 'soft' | 'light';

type OwnerCaptureConfig = {
  enabled?: boolean;
  front_title?: string | null;
  front_text?: string | null;
  front_cta?: string | null;
  front_media_url?: string | null;
  front_media_type?: string | null;
  back_title?: string | null;
  back_text?: string | null;
  back_cta?: string | null;
  back_media_url?: string | null;
  back_media_type?: string | null;
  accent_color?: string | null;
};

function buildHref(tenantSlug: string, intent: 'seller' | 'landlord', campaignQueryString?: string) {
  const params = new URLSearchParams(campaignQueryString || '');
  params.set('intent', intent);
  return `/captacion/${tenantSlug}?${params.toString()}`;
}

function MediaLayer({
  url,
  type,
  label,
  isLight,
}: {
  url?: string | null;
  type?: string | null;
  label: string;
  isLight: boolean;
}) {
  const mediaUrl = String(url || '').trim();
  const mediaType = String(type || '').trim().toLowerCase();
  if (mediaUrl && mediaType === 'video') {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={mediaUrl}
        autoPlay
        muted
        loop
        playsInline
        aria-label={label}
      />
    );
  }
  if (mediaUrl && mediaType !== 'none') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  return (
    <div
      className={`absolute inset-0 ${
        isLight
          ? 'bg-[linear-gradient(135deg,#ecfeff,#f8fafc_50%,#fff7ed)]'
          : 'bg-[linear-gradient(135deg,#083344,#111827_52%,#3b0764)]'
      }`}
    />
  );
}

export default function OwnerCaptureCard({
  tenantSlug,
  config,
  campaignQueryString,
  theme,
  isLight,
  cardClass,
}: {
  tenantSlug: string;
  config: OwnerCaptureConfig;
  campaignQueryString?: string;
  theme: PortfolioTheme;
  isLight: boolean;
  cardClass: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(config.accent_color || ''))
    ? String(config.accent_color)
    : '#22d3ee';
  const sellerHref = useMemo(
    () => buildHref(tenantSlug, 'seller', campaignQueryString),
    [tenantSlug, campaignQueryString]
  );
  const landlordHref = useMemo(
    () => buildHref(tenantSlug, 'landlord', campaignQueryString),
    [tenantSlug, campaignQueryString]
  );

  const faceClass =
    theme === 'light'
      ? 'text-zinc-950'
      : theme === 'soft'
      ? 'text-zinc-50'
      : 'text-white';
  const pillClass = isLight
    ? 'border-zinc-200 bg-white/85 text-zinc-700'
    : 'border-white/20 bg-black/30 text-white/85';
  const overlayClass = isLight
    ? 'bg-gradient-to-t from-white via-white/70 to-white/10'
    : 'bg-gradient-to-t from-black via-black/55 to-black/10';

  const renderFace = (side: 'front' | 'back') => {
    const isBack = side === 'back';
    const title = isBack
      ? config.back_title || 'Queres alquilar tu propiedad?'
      : config.front_title || 'Queres vender tu propiedad?';
    const text = isBack
      ? config.back_text || 'Publicala con seguimiento comercial y visitas ordenadas.'
      : config.front_text || 'Solicita una valoracion profesional para vender mejor.';
    const cta = isBack ? config.back_cta || 'Publicarla en alquiler' : config.front_cta || 'Solicitar valoracion';
    const href = isBack ? landlordHref : sellerHref;
    const mediaUrl = isBack ? config.back_media_url : config.front_media_url;
    const mediaType = isBack ? config.back_media_type : config.front_media_type;

    return (
      <div
        className={`absolute inset-0 overflow-hidden rounded-2xl ${faceClass} ${
          isBack ? '[transform:rotateY(180deg)] [backface-visibility:hidden]' : '[backface-visibility:hidden]'
        }`}
      >
        <MediaLayer url={mediaUrl} type={mediaType} label={title} isLight={isLight} />
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className="relative flex h-full min-h-[360px] flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pillClass}`}>
              {isBack ? 'Propietario locador' : 'Propietario vendedor'}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setFlipped((value) => !value);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${pillClass}`}
              aria-label={isBack ? 'Ver captacion de venta' : 'Ver captacion de alquiler'}
            >
              {isBack ? 'Venta' : 'Alquiler'}
            </button>
          </div>

          <div>
            <h3 className="max-w-[16rem] text-2xl font-semibold leading-tight">{title}</h3>
            <p className={`mt-3 line-clamp-4 max-w-[18rem] text-sm leading-relaxed ${isLight ? 'text-zinc-700' : 'text-zinc-200'}`}>
              {text}
            </p>
            <Link
              href={href}
              onClick={(event) => event.stopPropagation()}
              className="mt-5 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_14px_30px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5"
              style={{ backgroundColor: accent }}
            >
              {cta}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <article
      className={`group rounded-2xl border transition duration-300 hover:-translate-y-1.5 ${cardClass}`}
      style={{ perspective: '1200px' }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <div
        tabIndex={0}
        role="button"
        aria-pressed={flipped}
        onClick={() => setFlipped((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setFlipped((value) => !value);
          }
        }}
        className="relative min-h-[360px] cursor-pointer outline-none [transform-style:preserve-3d] transition-transform duration-500 focus-visible:ring-2 focus-visible:ring-cyan-300"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {renderFace('front')}
        {renderFace('back')}
      </div>
    </article>
  );
}
