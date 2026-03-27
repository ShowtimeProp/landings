import { notFound, redirect } from 'next/navigation';
import VcardGatewayClient from './vcard-gateway-client';

function normalizeSlug(raw: string): string {
  return String(raw || '').trim().toLowerCase().replace(/\.vcf$/i, '');
}

export default async function VcardGatewayPage({
  params,
}: {
  params: Promise<{ realtor_slug: string }>;
}) {
  const { realtor_slug } = await params;
  const decoded = decodeURIComponent(String(realtor_slug || '').trim());
  const normalized = normalizeSlug(decoded);
  if (!normalized) notFound();

  // Backward compatibility for old shared links (/vcard/:slug.vcf).
  if (decoded.toLowerCase().endsWith('.vcf')) {
    redirect(`/vcard-file/${encodeURIComponent(normalized)}.vcf`);
  }

  return <VcardGatewayClient slug={normalized} />;
}
