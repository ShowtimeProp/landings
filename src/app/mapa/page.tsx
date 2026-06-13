import type { Metadata } from 'next';

import MLSMapClient from '@/components/MLSMapClient';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

export const metadata: Metadata = {
  title: 'Mapa de propiedades en Mar del Plata | ShowtimeProp',
  description:
    'Todas las propiedades en venta y alquiler de Mar del Plata, de todas las inmobiliarias, unificadas en un solo mapa con búsqueda inteligente.',
};

type MapConfig = {
  mapboxToken: string;
  center: { lat: number; lng: number };
  zoom: number;
};

async function fetchConfig(): Promise<MapConfig | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/mls/public/config`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as MapConfig;
  } catch {
    return null;
  }
}

export default async function MapaPage() {
  const config = await fetchConfig();
  if (!config || !config.mapboxToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <p>El mapa no está disponible en este momento.</p>
      </main>
    );
  }
  return (
    <MLSMapClient
      backendUrl={BACKEND_URL}
      mapboxToken={config.mapboxToken}
      center={config.center}
      zoom={config.zoom}
    />
  );
}
