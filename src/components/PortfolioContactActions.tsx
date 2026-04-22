'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type ThemeMode = 'light' | 'soft' | 'dark';

type Props = {
  backendUrl: string;
  tenantSlug: string;
  defaultPropertyId?: string | null;
  whatsappUrl?: string | null;
  referralCode?: string | null;
  campaignQueryString?: string;
  emailButtonClass: string;
  themeMode: ThemeMode;
};

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

function normalizeWhatsappInput(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (/^\d{8,}$/.test(digits)) return `+${digits}`;
  }
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length >= 8) return digitsOnly;
  return '';
}

export default function PortfolioContactActions({
  backendUrl,
  tenantSlug,
  defaultPropertyId,
  whatsappUrl,
  referralCode,
  campaignQueryString,
  emailButtonClass,
  themeMode,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const campaign = useMemo(() => {
    const out: Record<string, string> = {};
    const params = new URLSearchParams(campaignQueryString || '');
    for (const key of CAMPAIGN_KEYS) {
      const value = (params.get(key) || '').trim();
      if (value) out[key] = value;
    }
    return out;
  }, [campaignQueryString]);

  const hiddenSubject = useMemo(() => {
    const parts: string[] = ['source=portfolio_page'];
    if (referralCode) parts.push(`ref=${referralCode}`);
    for (const key of CAMPAIGN_KEYS) {
      const value = campaign[key];
      if (value) parts.push(`${key}=${value}`);
    }
    return parts.join(' ');
  }, [campaign, referralCode]);

  const modalCardClass =
    themeMode === 'light'
      ? 'border-zinc-200 bg-white text-zinc-900'
      : themeMode === 'soft'
      ? 'border-white/15 bg-slate-900 text-zinc-100'
      : 'border-white/15 bg-zinc-900 text-zinc-100';

  const inputClass =
    themeMode === 'light'
      ? 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400'
      : 'border-white/20 bg-black/25 text-zinc-100 placeholder:text-zinc-500';

  const closeModal = () => {
    setOpen(false);
    setError(null);
  };

  const submitEmailLead = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedWhatsapp = normalizeWhatsappInput(whatsapp);
    const normalizedMessage = message.trim();

    if (!normalizedEmail || !normalizedWhatsapp || !normalizedMessage) {
      setError('Completá email, WhatsApp y mensaje.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${backendUrl}/api/properties/public/contact-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          property_id: defaultPropertyId || null,
          ref: referralCode || null,
          source: 'portfolio_page',
          email: normalizedEmail,
          whatsapp: normalizedWhatsapp,
          message: normalizedMessage,
          subject: hiddenSubject,
          page_url: window.location.href,
          campaign,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail =
          (typeof payload?.detail === 'string' ? payload.detail : '') ||
          'No se pudo enviar tu consulta por email.';
        throw new Error(detail);
      }

      setEmail('');
      setWhatsapp('');
      setMessage('');
      setSuccess('Consulta enviada. Te respondemos a la brevedad.');
      setOpen(false);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'No se pudo enviar tu consulta.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            data-track-whatsapp="true"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${emailButtonClass}`}
        >
          Email
        </button>
      </div>
      {success ? (
        <p className="text-[11px] font-medium text-emerald-400">
          {success}
        </p>
      ) : null}

      {open && isMounted
        ? createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={submitEmailLead}
            className={`w-full max-w-md rounded-2xl border p-4 shadow-2xl ${modalCardClass}`}
          >
            <h3 className="text-base font-semibold">Enviar consulta por email</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Completá tus datos y tu consulta se procesará por canal Email en el CRM.
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="portfolio-email" className="mb-1 block text-xs font-medium">
                  Email
                </label>
                <input
                  id="portfolio-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40 ${inputClass}`}
                  placeholder="tuemail@dominio.com"
                />
              </div>
              <div>
                <label htmlFor="portfolio-whatsapp" className="mb-1 block text-xs font-medium">
                  WhatsApp
                </label>
                <input
                  id="portfolio-whatsapp"
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40 ${inputClass}`}
                  placeholder="+54 9 223 123 4567"
                />
              </div>
              <div>
                <label htmlFor="portfolio-message" className="mb-1 block text-xs font-medium">
                  Mensaje
                </label>
                <textarea
                  id="portfolio-message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40 ${inputClass}`}
                  placeholder="Contanos qué propiedad te interesa."
                />
              </div>
            </div>

            {error ? (
              <p className="mt-3 text-xs text-rose-400">{error}</p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>,
          document.body
        )
        : null}
    </>
  );
}
