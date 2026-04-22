'use client';

import dynamic from 'next/dynamic';
import type { PortfolioTheme } from './PortfolioMapBlock';

const PortfolioMapBlock = dynamic(() => import('./PortfolioMapBlock'), {
  ssr: false,
  loading: () => (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
      Cargando mapa…
    </section>
  ),
});

type PropertyLike = {
  id: string;
  name: string;
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function PortfolioMapLoader(props: {
  accessToken: string;
  styleUrl?: string | null;
  tenantSlug: string;
  referralCode?: string | null;
  campaignQueryString?: string;
  properties: PropertyLike[];
  theme: PortfolioTheme;
  isLight: boolean;
  sectionClass: string;
  subtleTextClass: string;
  titleTextClass: string;
}) {
  return <PortfolioMapBlock {...props} />;
}
