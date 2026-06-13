import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

type Listing = {
  id: string;
  title: string | null;
  description: string | null;
  address: string | null;
  zona: string | null;
  localidad: string | null;
  property_type: string | null;
  tipo_operacion: string | null;
  area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ambientes: number | null;
  price: number | null;
  price_currency: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  images_array: string[] | null;
  inmobiliaria: string | null;
  inmobiliaria_phone: string | null;
  inmobiliaria_whatsapp: string | null;
  detail_url: string | null;
  days_on_market: number | null;
  tour_virtual: string | null;
};

async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/mls/public/listings/${encodeURIComponent(id)}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Listing;
  } catch {
    return null;
  }
}

function formatPrice(price: number | null, currency: string | null): string {
  if (!price) return 'Precio a consultar';
  const cur = currency === 'USD' ? 'U$S' : '$';
  return `${cur} ${Math.round(price).toLocaleString('es-AR')}`;
}

const OPERATION_LABELS: Record<string, string> = {
  VENTA: 'Venta',
  ALQUILER: 'Alquiler',
  ALQUILER_TEMPORARIO: 'Alquiler temporario',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) return { title: 'Propiedad no encontrada | ShowtimeProp' };
  const op = OPERATION_LABELS[listing.tipo_operacion || ''] || '';
  return {
    title: `${listing.title || 'Propiedad'} ${op ? `en ${op.toLowerCase()}` : ''} | Mar del Plata`,
    description: (listing.description || '').slice(0, 160),
    openGraph: listing.image_url ? { images: [listing.image_url] } : undefined,
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) notFound();

  const images = (listing.images_array || []).filter(
    (i): i is string => typeof i === 'string'
  );
  const op = OPERATION_LABELS[listing.tipo_operacion || ''] || listing.tipo_operacion;
  const whatsapp = (listing.inmobiliaria_whatsapp || listing.inmobiliaria_phone || '')
    .replace(/[^\d]/g, '');

  const facts: Array<[string, string]> = [];
  if (listing.ambientes) facts.push(['Ambientes', String(listing.ambientes)]);
  if (listing.bedrooms) facts.push(['Dormitorios', String(listing.bedrooms)]);
  if (listing.bathrooms) facts.push(['Baños', String(listing.bathrooms)]);
  if (listing.area_m2) facts.push(['Superficie', `${listing.area_m2} m²`]);
  if (listing.zona) facts.push(['Zona', listing.zona]);
  if (listing.days_on_market != null)
    facts.push(['Días publicada', String(listing.days_on_market)]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <a href="/mapa" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Volver al mapa
        </a>

        <header className="mt-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {op} {listing.property_type ? `· ${listing.property_type}` : ''}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            {listing.title || 'Propiedad'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {[listing.address, listing.zona, listing.localidad].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-2 text-3xl font-bold text-cyan-400">
            {formatPrice(listing.price, listing.price_currency)}
          </p>
        </header>

        {images.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3">
            {images.slice(0, 9).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`Foto ${i + 1}`}
                loading={i > 2 ? 'lazy' : undefined}
                className={`w-full rounded-xl object-cover ${i === 0 ? 'col-span-2 h-64 md:col-span-2' : 'h-32 md:h-40'}`}
              />
            ))}
          </div>
        )}

        {facts.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {listing.description && (
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold text-white">Descripción</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {listing.description}
            </p>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white">
            Publicada por {listing.inmobiliaria || 'inmobiliaria de Mar del Plata'}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.startsWith('54') ? whatsapp : `54${whatsapp}`}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Consultar por WhatsApp
              </a>
            )}
            {listing.tour_virtual && (
              <a
                href={listing.tour_virtual}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
              >
                Ver tour virtual
              </a>
            )}
            {listing.detail_url && (
              <a
                href={listing.detail_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              >
                Publicación original
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
