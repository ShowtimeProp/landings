'use client';

import { useMemo, useState } from 'react';

const CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
] as const;

type Props = {
  backendUrl: string;
  tenantSlug: string;
  articleSlug: string;
  referralCode?: string | null;
  contentFormat?: string | null;
  campaignQueryString?: string;
};

function normalizeWhatsapp(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (/^\d{8,}$/.test(digits)) return `+${digits}`;
  }
  const digitsOnly = cleaned.replace(/\D/g, '');
  return digitsOnly.length >= 8 ? digitsOnly : '';
}

export default function BlogLeadForm({
  backendUrl,
  tenantSlug,
  articleSlug,
  referralCode,
  contentFormat,
  campaignQueryString,
}: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const campaign = useMemo(() => {
    const out: Record<string, string> = {};
    const params = new URLSearchParams(campaignQueryString || '');
    for (const key of CAMPAIGN_KEYS) {
      const value = (params.get(key) || '').trim();
      if (value) out[key] = value;
    }
    return out;
  }, [campaignQueryString]);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError(null);
    setSuccess(null);
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanWhatsapp = normalizeWhatsapp(whatsapp);
    if (!cleanName || (!cleanEmail && !cleanWhatsapp)) {
      setError('Completá nombre y al menos un contacto.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${backendUrl}/api/blogs/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          article_slug: articleSlug,
          full_name: cleanName,
          email: cleanEmail || null,
          whatsapp: cleanWhatsapp || null,
          message: message.trim() || null,
          ref: referralCode || null,
          page_url: window.location.href,
          content_format: contentFormat || 'article',
          campaign,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'No se pudo enviar la consulta.');
      }
      setFullName('');
      setEmail('');
      setWhatsapp('');
      setMessage('');
      setSuccess('Consulta enviada. Te vamos a contactar a la brevedad.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la consulta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Nombre</span>
          <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-900" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">WhatsApp</span>
          <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-900" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Email</span>
        <input type="email" className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-900" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700">Mensaje</span>
        <textarea className="min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-900" value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60">
        {submitting ? 'Enviando...' : 'Enviar consulta'}
      </button>
    </form>
  );
}
