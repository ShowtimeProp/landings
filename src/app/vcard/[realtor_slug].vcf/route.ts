const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

type VCardTenant = {
  name: string;
  slug: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  social_links?: Record<string, string> | null;
  martillero_responsable?: string | null;
  martillero_registro?: string | null;
  vcard_slug?: string | null;
  vcard_url?: string | null;
};

type VCardApiResponse = {
  status: 'ok';
  tenant: VCardTenant;
  contact_name: string;
  business_name?: string | null;
  portfolio_url?: string | null;
};

function escVcard(raw: unknown): string {
  const value = String(raw || '');
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function normalizePhone(raw: unknown): string {
  const input = String(raw || '').trim();
  if (!input) return '';
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  return cleaned.replace(/\D/g, '');
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length <= 1) return { first: fullName.trim(), last: '' };
  return {
    first: parts.slice(0, -1).join(' '),
    last: parts[parts.length - 1] || '',
  };
}

function buildVcardText(data: VCardApiResponse): string {
  const tenant = data.tenant;
  const contactName = String(data.contact_name || tenant.name || 'Realtor').trim();
  const businessName = String(data.business_name || tenant.name || '').trim();
  const { first, last } = splitName(contactName);

  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`FN:${escVcard(contactName)}`);
  lines.push(`N:${escVcard(last)};${escVcard(first)};;;`);

  if (businessName) lines.push(`ORG:${escVcard(businessName)}`);

  const legalTitle = String(tenant.martillero_responsable || '').trim();
  const legalReg = String(tenant.martillero_registro || '').trim();
  if (legalTitle) lines.push(`TITLE:${escVcard(`Martillero Responsable: ${legalTitle}`)}`);
  if (legalReg) lines.push(`NOTE:${escVcard(`Reg. ${legalReg}`)}`);

  const mobilePhone = normalizePhone(tenant.whatsapp || tenant.phone);
  const workPhone = normalizePhone(tenant.phone);
  if (mobilePhone) lines.push(`TEL;TYPE=CELL:${escVcard(mobilePhone)}`);
  if (workPhone && workPhone !== mobilePhone) lines.push(`TEL;TYPE=WORK,VOICE:${escVcard(workPhone)}`);

  const email = String(tenant.email || '').trim();
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escVcard(email)}`);

  if (data.portfolio_url) lines.push(`URL;TYPE=WORK:${escVcard(data.portfolio_url)}`);
  if (tenant.vcard_url) lines.push(`URL;TYPE=VCARD:${escVcard(tenant.vcard_url)}`);

  const website = String(tenant.social_links?.website || '').trim();
  if (website) lines.push(`URL:${escVcard(website)}`);

  const photoUrl = String(tenant.profile_photo_url || '').trim();
  const logoUrl = String(tenant.logo_url || '').trim();
  if (photoUrl) lines.push(`PHOTO;VALUE=URI:${escVcard(photoUrl)}`);
  if (logoUrl) lines.push(`LOGO;VALUE=URI:${escVcard(logoUrl)}`);

  lines.push('END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
}

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const rawParamSlug = String(params.realtor_slug || '').trim();
  const urlPath = new URL(request.url).pathname;
  const rawPathSlug = decodeURIComponent(urlPath.split('/').pop() || '').replace(/\.vcf$/i, '').trim();
  const normalizedSlug = String(rawParamSlug || rawPathSlug).trim().toLowerCase();
  if (!normalizedSlug) {
    return new Response('Contacto no encontrado', { status: 404 });
  }

  const apiUrl = `${BACKEND_URL}/api/properties/public/vcard?realtor_slug=${encodeURIComponent(
    normalizedSlug
  )}`;
  const response = await fetch(apiUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    return new Response('Contacto no encontrado', { status: 404 });
  }
  const payload = (await response.json()) as VCardApiResponse;
  if (!payload?.tenant?.slug || !payload?.contact_name) {
    return new Response('Contacto no encontrado', { status: 404 });
  }

  const vcardText = buildVcardText(payload);
  const filenameSlug = String(payload.tenant.vcard_slug || normalizedSlug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safeFile = filenameSlug || 'contacto';

  return new Response(vcardText, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `inline; filename="${safeFile}.vcf"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
