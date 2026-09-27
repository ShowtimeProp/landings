import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { site } from './tours/_lib/site';
import { showtimeOrganization } from '@/lib/seo/organization-structured-data';
import { serializeJsonLd } from '@/lib/seo/serialize-json-ld';

const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

export const metadata: Metadata = {
  title: 'ShowtimeProp | Propiedades y tours virtuales 360°',
  description: 'Landings y portfolios de inmobiliarias con tours virtuales 360° y atención 24/7 con inteligencia artificial.',
  alternates: { canonical: `${LANDINGS_URL}/` },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center bg-ink px-6 py-16 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(showtimeOrganization) }} />
      <div className="mx-auto w-full max-w-3xl">
        <Image src={site.logo} alt="ShowtimeProp" width={88} height={88} priority />
        <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-gold">ShowtimeProp</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Conocé tu próxima propiedad, estés donde estés.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-body">
          Landings y portfolios de inmobiliarias con tours virtuales 360° y atención 24/7
          con inteligencia artificial. Recorré los espacios y consultá los detalles de cada propiedad.
        </p>
        <Link href="/tours" className="mt-8 inline-flex rounded-btn bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-hi focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          Conocé nuestros tours virtuales
        </Link>
        <aside className="mt-14 border-t border-hairline-2 pt-6 text-body">
          <h2 className="font-semibold text-white">¿Llegaste por un cartel?</h2>
          <p className="mt-2">Escaneá el QR del cartel para ver la propiedad y su tour virtual.</p>
        </aside>
      </div>
    </main>
  );
}
