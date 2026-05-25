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
  button_text_color?: string | null;
};

function buildHref(tenantSlug: string, intent: 'seller' | 'landlord', campaignQueryString?: string) {
  const params = new URLSearchParams(campaignQueryString || '');
  params.set('intent', intent);
  return `/captacion/${tenantSlug}?${params.toString()}`;
}

function buildBunnyEmbedUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    const isBunnyHost =
      host === 'iframe.mediadelivery.net' ||
      host === 'player.mediadelivery.net' ||
      host.endsWith('.mediadelivery.net');
    if (!isBunnyHost) return null;

    const parts = url.pathname.split('/').filter(Boolean);
    let libraryId = '';
    let videoId = '';

    if (parts[0] === 'play' && parts.length >= 3) {
      libraryId = parts[1] || '';
      videoId = parts[2] || '';
    } else if (parts[0] === 'embed' && parts.length >= 3) {
      libraryId = parts[1] || '';
      videoId = parts[2] || '';
    }

    if (!libraryId || !videoId) return null;

    const params = new URLSearchParams();
    params.set('autoplay', 'true');
    params.set('loop', 'true');
    params.set('muted', 'true');
    params.set('playsinline', 'true');
    params.set('preload', 'true');
    params.set('compactControls', 'true');
    params.set('showSpeed', 'false');

    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
  } catch {
    return null;
  }
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
    const bunnyEmbedUrl = buildBunnyEmbedUrl(mediaUrl);
    if (bunnyEmbedUrl) {
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <iframe
            title={label}
            src={bunnyEmbedUrl}
            className="absolute inset-0 z-0 block h-full w-full border-0 pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              transform: 'scale(1.06)',
              transformOrigin: 'center center',
            }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      );
    }
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
  const buttonTextColor = /^#[0-9a-fA-F]{6}$/.test(String(config.button_text_color || ''))
    ? String(config.button_text_color)
    : '#111827';
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
    ? 'bg-gradient-to-t from-white via-white/58 to-white/6'
    : 'bg-gradient-to-t from-black via-black/42 to-black/8';

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
              className="mt-5 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold shadow-[0_14px_30px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5"
              style={{ backgroundColor: accent, color: buttonTextColor }}
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
