import { notFound, redirect } from 'next/navigation';
import VcardGatewayClient from './vcard-gateway-client';

function normalizeSlug(raw: string): string {
  return String(raw || '').trim().toLowerCase().replace(/\.vcf$/i, '');
}

export default async function VcardGatewayPage({
  params,
  searchParams,
}: {
  params: Promise<{ realtor_slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { realtor_slug } = await params;
  const resolvedSearchParams = await searchParams;
  const normalizedRef = String(resolvedSearchParams.ref || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const refQuery = normalizedRef ? `?ref=${encodeURIComponent(normalizedRef)}` : '';
  const decoded = decodeURIComponent(String(realtor_slug || '').trim());
  const normalized = normalizeSlug(decoded);
  if (!normalized) notFound();

  // Backward compatibility for old shared links (/vcard/:slug.vcf).
  if (decoded.toLowerCase().endsWith('.vcf')) {
    redirect(`/vcard-file/${encodeURIComponent(normalized)}.vcf${refQuery}`);
  }

  return <VcardGatewayClient slug={normalized} refCode={normalizedRef || undefined} />;
}
