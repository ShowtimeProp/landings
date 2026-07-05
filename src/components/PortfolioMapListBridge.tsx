'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  PORTFOLIO_CARD_ACTIVE_EVENT,
  PORTFOLIO_MARKER_SELECT_EVENT,
  type PortfolioPropertyEventDetail,
} from '@/components/portfolio-map-events';

export default function PortfolioMapListBridge({
  map,
  children,
  isLight,
}: {
  map: ReactNode;
  children: ReactNode;
  isLight: boolean;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const updateHint = () => {
      const canScroll = list.scrollHeight > list.clientHeight + 32;
      setShowScrollHint(canScroll && list.scrollTop < 24);
    };

    updateHint();
    list.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);
    return () => {
      list.removeEventListener('scroll', updateHint);
      window.removeEventListener('resize', updateHint);
    };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ratios = new Map<string, number>();
    const cards = Array.from(list.querySelectorAll<HTMLElement>('[data-portfolio-card-id]'));
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.portfolioCardId;
          if (!id) return;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let activeId = '';
        let activeRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > activeRatio) {
            activeId = id;
            activeRatio = ratio;
          }
        });
        if (!activeId || activeRatio < 0.18) return;

        window.dispatchEvent(
          new CustomEvent<PortfolioPropertyEventDetail>(PORTFOLIO_CARD_ACTIVE_EVENT, {
            detail: { propertyId: activeId, source: 'scroll' },
          })
        );
      },
      {
        root: list,
        threshold: [0.18, 0.32, 0.5, 0.68, 0.86],
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [children]);

  useEffect(() => {
    const onMarkerSelect = (event: Event) => {
      const detail = (event as CustomEvent<PortfolioPropertyEventDetail>).detail;
      if (!detail?.propertyId) return;

      const list = listRef.current;
      const escapedId =
        typeof window.CSS?.escape === 'function'
          ? window.CSS.escape(detail.propertyId)
          : detail.propertyId.replace(/["\\]/g, '\\$&');
      const card = list?.querySelector<HTMLElement>(`[data-portfolio-card-id="${escapedId}"]`);
      if (!card) return;

      card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      card.classList.add('portfolio-property-card--map-highlight');

      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(() => {
        card.classList.remove('portfolio-property-card--map-highlight');
        highlightTimerRef.current = null;
      }, 1800);
    };

    window.addEventListener(PORTFOLIO_MARKER_SELECT_EVENT, onMarkerSelect);
    return () => {
      window.removeEventListener(PORTFOLIO_MARKER_SELECT_EVENT, onMarkerSelect);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const hintClass = isLight
    ? 'border-zinc-200 bg-white/95 text-zinc-700 shadow-[0_12px_30px_rgba(15,23,42,0.14)]'
    : 'border-white/15 bg-zinc-950/90 text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.38)]';

  return (
    <section id="portfolio-grid" className="relative left-1/2 mt-8 grid w-screen max-w-[100vw] -translate-x-1/2 gap-5 overflow-x-hidden px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(560px,0.95fr)] lg:items-start">
      <div className="hidden lg:sticky lg:top-5 lg:block">{map}</div>
      <div className="relative">
        <div
          ref={listRef}
          className="lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {children}
        </div>
        {showScrollHint ? (
          <div className={`pointer-events-none absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md lg:inline-flex ${hintClass}`}>
            <span className="relative flex h-8 w-5 items-start justify-center rounded-full border border-current/45">
              <span className="mt-1 h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </span>
            Deslizá para ver más
          </div>
        ) : null}
      </div>
    </section>
  );
}
