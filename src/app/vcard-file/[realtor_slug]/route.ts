import sharp from 'sharp';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const MAX_EMBEDDED_PHOTO_BYTES = 512 * 1024;
const MAX_SOURCE_PHOTO_BYTES = 8 * 1024 * 1024;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  smart_bio_url?: string | null;
};

type VCardApiResponse = {
  status: 'ok';
  tenant: VCardTenant;
  contact_name: string;
  business_name?: string | null;
  portfolio_url?: string | null;
};

const LEGAL_DISCLAIMER =
  'Todas las propiedades que figuran en mi perfil se encuentran a cargo del profesional matriculado de la oficina, la intermediación y la conclusión de las operaciones serán llevadas exclusivamente por él.';

function normalizeRefCode(raw: string | null): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function foldVcardLine(line: string): string {
  if (line.length <= 75) return line;
  let out = '';
  let cursor = 0;
  while (cursor < line.length) {
    const chunk = line.slice(cursor, cursor + 75);
    out += cursor === 0 ? chunk : `\r\n ${chunk}`;
    cursor += 75;
  }
  return out;
}

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

async function buildEmbeddedPhotoLine(photoUrl: string): Promise<string | null> {
  if (!photoUrl) return null;
  try {
    const photoResponse = await fetch(photoUrl, { next: { revalidate: 86400 } });
    if (!photoResponse.ok) return null;

    const contentType = String(photoResponse.headers.get('content-type') || '').trim();
    if (!contentType.toLowerCase().startsWith('image/')) return null;

    const declaredLength = Number(photoResponse.headers.get('content-length') || 0);
    if (declaredLength > MAX_SOURCE_PHOTO_BYTES) return null;

    const bytes = await photoResponse.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_SOURCE_PHOTO_BYTES) return null;

    const compatiblePhoto = await sharp(Buffer.from(bytes))
      .rotate()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    if (!compatiblePhoto.byteLength || compatiblePhoto.byteLength > MAX_EMBEDDED_PHOTO_BYTES) return null;

    const encoded = compatiblePhoto.toString('base64');
    return `PHOTO;ENCODING=b;TYPE=JPEG:${encoded}`;
  } catch {
    return null;
  }
}

async function buildVcardText(data: VCardApiResponse): Promise<string> {
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
  const legalProfessional = [legalTitle, legalReg ? `Reg. ${legalReg}` : '']
    .filter(Boolean)
    .join(' · ');
  const legalNote = legalProfessional
    ? `Martillero Responsable: ${legalProfessional}.\n\n${LEGAL_DISCLAIMER}`
    : LEGAL_DISCLAIMER;
  lines.push(`NOTE:${escVcard(legalNote)}`);

  const commercialPhone = normalizePhone(tenant.whatsapp || tenant.phone);
  const privatePhone = normalizePhone(tenant.phone);
  if (commercialPhone) {
    lines.push(`item1.TEL;TYPE=WORK,VOICE:${escVcard(commercialPhone)}`);
    lines.push(`item1.X-ABLabel:${escVcard('Comercial / Asistente 🤖')}`);
  }
  if (privatePhone && privatePhone !== commercialPhone) {
    lines.push(`item2.TEL;TYPE=CELL,VOICE:${escVcard(privatePhone)}`);
    lines.push(`item2.X-ABLabel:${escVcard('Numero Privado')}`);
  }

  const email = String(tenant.email || '').trim();
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escVcard(email)}`);

  if (data.portfolio_url) {
    lines.push(`item3.URL;TYPE=WORK:${escVcard(data.portfolio_url)}`);
    lines.push(`item3.X-ABLabel:${escVcard('Portfolio')}`);
  }
  const smartBioUrl = String(tenant.smart_bio_url || '').trim();
  if (smartBioUrl) {
    lines.push(`item4.URL;TYPE=WORK:${escVcard(smartBioUrl)}`);
    lines.push(`item4.X-ABLabel:${escVcard('E-Card')}`);
  }

  const website = String(tenant.social_links?.website || '').trim();
  if (website) {
    lines.push(`item5.URL:${escVcard(website)}`);
    lines.push(`item5.X-ABLabel:${escVcard('WebSite')}`);
  }

  const photoUrl = String(tenant.profile_photo_url || '').trim();
  const logoUrl = String(tenant.logo_url || '').trim();
  const embeddedPhoto = await buildEmbeddedPhotoLine(photoUrl);
  if (embeddedPhoto) {
    lines.push(embeddedPhoto);
  } else if (photoUrl) {
    lines.push(`PHOTO;VALUE=URI:${escVcard(photoUrl)}`);
  }
  if (logoUrl) lines.push(`LOGO;VALUE=URI:${escVcard(logoUrl)}`);

  lines.push('END:VCARD');
  const foldedLines = lines.map(foldVcardLine);
  return `${foldedLines.join('\r\n')}\r\n`;
}

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const requestUrl = new URL(request.url);
  const referralCode = normalizeRefCode(requestUrl.searchParams.get('ref'));
  const params = await context.params;
  const rawParamSlug = String(params.realtor_slug || '').trim();
  const urlPath = requestUrl.pathname;
  const rawPathSlug = decodeURIComponent(urlPath.split('/').pop() || '').replace(/\.vcf$/i, '').trim();
  const normalizedSlug = String(rawParamSlug || rawPathSlug).trim().toLowerCase().replace(/\.vcf$/i, '');
  if (!normalizedSlug) {
    return new Response('Contacto no encontrado', { status: 404 });
  }

  const apiParams = new URLSearchParams({
    realtor_slug: normalizedSlug,
  });
  if (referralCode) {
    apiParams.set('ref', referralCode);
  }
  const apiUrl = `${BACKEND_URL}/api/properties/public/vcard?${apiParams.toString()}`;
  const response = await fetch(apiUrl, { cache: 'no-store' });
  if (!response.ok) {
    return new Response('Contacto no encontrado', { status: 404 });
  }
  const payload = (await response.json()) as VCardApiResponse;
  if (!payload?.tenant?.slug || !payload?.contact_name) {
    return new Response('Contacto no encontrado', { status: 404 });
  }

  const vcardText = await buildVcardText(payload);
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
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
