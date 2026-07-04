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
  theme?: 'dark' | 'soft' | 'light';
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
  theme = 'light',
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
  const isLight = theme === 'light';
  const labelClass = isLight ? 'text-zinc-700' : 'text-zinc-200';
  const fieldClass = isLight
    ? 'border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900'
    : 'border-white/10 bg-black/25 text-zinc-100 placeholder:text-zinc-500 focus:border-[#f4c400]';
  const buttonClass = isLight
    ? 'bg-zinc-950 text-white hover:bg-zinc-800'
    : 'bg-[#f4c400] text-zinc-950 hover:bg-[#ffd84a]';

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
          <span className={`font-medium ${labelClass}`}>Nombre</span>
          <input className={`w-full rounded-lg border px-3 py-2 outline-none ${fieldClass}`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className={`font-medium ${labelClass}`}>WhatsApp</span>
          <input className={`w-full rounded-lg border px-3 py-2 outline-none ${fieldClass}`} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className={`font-medium ${labelClass}`}>Email</span>
        <input type="email" className={`w-full rounded-lg border px-3 py-2 outline-none ${fieldClass}`} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className={`font-medium ${labelClass}`}>Mensaje</span>
        <textarea className={`min-h-24 w-full rounded-lg border px-3 py-2 outline-none ${fieldClass}`} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      <button type="submit" disabled={submitting} className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${buttonClass}`}>
        {submitting ? 'Enviando...' : 'Enviar consulta'}
      </button>
    </form>
  );
}
