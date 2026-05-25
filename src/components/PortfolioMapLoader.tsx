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
  property_type?: string | null;
  operation_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  images?: unknown[];
  address?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function PortfolioMapLoader(props: {
  accessToken: string;
  styleUrl?: string | null;
  tenantSlug: string;
  tenantName: string;
  referralCode?: string | null;
  campaignQueryString?: string;
  properties: PropertyLike[];
  theme: PortfolioTheme;
  isLight: boolean;
  sectionClass: string;
  subtleTextClass: string;
  titleTextClass: string;
  fillViewport?: boolean;
  mapHeightClass?: string;
  title?: string;
  subtitle?: string;
}) {
  return <PortfolioMapBlock {...props} />;
}
