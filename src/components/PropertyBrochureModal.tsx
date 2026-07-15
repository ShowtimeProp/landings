'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GlassButton } from '@/components/ui/glass-button';

type BrochureProperty = {
  name: string;
  description?: string | null;
  images?: (string | { url?: string })[];
  address?: Record<string, unknown> | null;
  property_type?: string | null;
  operation_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  price?: number | null;
  currency?: string | null;
};

type Props = {
  property: BrochureProperty;
  isLight: boolean;
};

const imageUrl = (value: string | { url?: string }) =>
  typeof value === 'string' ? value : value.url || '';
const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function addressText(address?: Record<string, unknown> | null) {
  if (!address) return '';
  return ['street', 'number', 'neighborhood', 'city']
    .map((key) => String(address[key] || '').trim())
    .filter(Boolean)
    .join(' ');
}

/** Icono PDF moderno (documento + badge) para el trigger de ficha. */
function PdfBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pdfDocGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <path
        d="M6.2 2.5h7.2L18.5 7.6V20a1.5 1.5 0 0 1-1.5 1.5H6.2A1.5 1.5 0 0 1 4.7 20V4A1.5 1.5 0 0 1 6.2 2.5Z"
        fill="url(#pdfDocGrad)"
      />
      <path d="M13.4 2.6v4.2c0 .5.4.9.9.9h4.1" fill="#fecaca" opacity="0.95" />
      <rect x="7.2" y="12.2" width="9.6" height="5.2" rx="1.2" fill="#fff" opacity="0.96" />
      <text
        x="12"
        y="16.05"
        textAnchor="middle"
        fontSize="4.2"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        letterSpacing="0.4"
        fill="#b91c1c"
      >
        PDF
      </text>
    </svg>
  );
}

export default function PropertyBrochureModal({ property, isLight }: Props) {
  const images = useMemo(
    () => (property.images || []).map(imageUrl).filter(Boolean),
    [property.images]
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(images.slice(0, 6));
  const [form, setForm] = useState({ fullName: '', agency: '', whatsapp: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const toggleImage = (url: string) => {
    setError('');
    setSelected((current) => {
      if (current.includes(url)) return current.filter((item) => item !== url);
      if (current.length >= 6) {
        setError('Podés elegir hasta 6 fotos.');
        return current;
      }
      return [...current, url];
    });
  };

  const generate = () => {
    if (!form.fullName.trim() || !form.agency.trim() || !form.whatsapp.trim()) {
      setError('Completá nombre, inmobiliaria y WhatsApp.');
      return;
    }
    if (!selected.length) {
      setError('Elegí al menos una foto.');
      return;
    }
    const popup = window.open('', '_blank');
    if (!popup) {
      setError('El navegador bloqueó la ventana. Habilitá popups e intentá nuevamente.');
      return;
    }
    popup.opener = null;
    const details = [
      property.property_type,
      property.operation_type,
      property.ambientes != null ? `${property.ambientes} ambientes` : null,
      property.bedrooms != null ? `${property.bedrooms} dormitorios` : null,
      property.bathrooms != null ? `${property.bathrooms} baños` : null,
      property.area_sqm != null ? `${property.area_sqm} m²` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const price =
      property.price != null
        ? `${property.currency || 'USD'} ${Number(property.price).toLocaleString('es-AR')}`
        : 'Consultar';
    const photos = selected
      .map((url, index) => `<img src="${escapeHtml(url)}" alt="Foto ${index + 1}" />`)
      .join('');
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title></title>
      <style>
        @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#18181b;margin:0}
        .head{border-bottom:4px solid #f4c430;padding-bottom:10px}.brand{text-align:center;font-size:14px;font-weight:700;color:#3f3f46;text-transform:uppercase;letter-spacing:3px}
        h1{font-size:25px;margin:6px 0}.address{color:#52525b}.price{font-size:21px;font-weight:700;margin:12px 0;color:#8a6800}
        .details{font-size:13px;font-weight:600;margin-bottom:12px}.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
        .gallery img{width:100%;height:175px;object-fit:cover;border-radius:7px}.desc{font-size:12px;line-height:1.45;margin:14px 0;white-space:pre-line}
        .contact{margin-top:14px;border:2px solid #f4c430;border-radius:10px;padding:12px;background:#fffbea}
        .contact strong{font-size:16px}.legal{font-size:9px;color:#71717a;margin-top:10px}
        .actions{position:fixed;right:12px;top:12px}@media print{.actions{display:none}.gallery img{height:160px}}
      </style></head><body>
      <button class="actions" onclick="window.print()">Guardar como PDF</button>
      <section class="head"><div class="brand">Ficha comercial</div><h1>${escapeHtml(property.name)}</h1>
      <div class="address">${escapeHtml(addressText(property.address))}</div></section>
      <div class="price">${escapeHtml(price)}</div><div class="details">${escapeHtml(details)}</div>
      <section class="gallery">${photos}</section>
      <section class="desc">${escapeHtml(property.description || '')}</section>
      <section class="contact"><div>Para más información contactá a</div><strong>${escapeHtml(form.fullName)}</strong>
      <div>${escapeHtml(form.agency)}</div><div>WhatsApp: ${escapeHtml(form.whatsapp)}</div></section>
      <p class="legal">Información orientativa, sujeta a verificación y disponibilidad. Las operaciones inmobiliarias son realizadas por el corredor matriculado responsable.</p>
      <script>window.onload=()=>setTimeout(()=>{document.title='';window.print()},500)</script></body></html>`);
    popup.document.close();
  };

  const fieldClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none ${isLight ? 'border-zinc-300 bg-white text-zinc-900' : 'border-white/15 bg-zinc-900 text-white'}`;
  return (
    <>
      <span className="group relative inline-flex">
        <GlassButton
          type="button"
          size="icon"
          title="Bajar Ficha"
          aria-label="Bajar Ficha PDF"
          onClick={() => setOpen(true)}
        >
          <PdfBadgeIcon className="h-5 w-5 drop-shadow-sm" />
        </GlassButton>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Bajar Ficha
        </span>
      </span>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="brochure-modal-scroll fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-black/75 p-4 pt-6 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Obtener ficha PDF"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              className={`mx-auto w-full max-w-3xl rounded-2xl border p-5 shadow-2xl ${isLight ? 'border-zinc-200 bg-white text-zinc-900' : 'border-white/15 bg-zinc-950 text-white'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Obtener ficha PDF</h2>
                  <p className="text-sm opacity-70">
                    Personalizala con tus datos y elegí hasta 6 fotos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-1 text-xl"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <input
                  className={fieldClass}
                  placeholder="Nombre y apellido"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                <input
                  className={fieldClass}
                  placeholder="Inmobiliaria"
                  value={form.agency}
                  onChange={(e) => setForm({ ...form, agency: e.target.value })}
                />
                <input
                  className={fieldClass}
                  placeholder="WhatsApp"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <p className="mt-5 text-sm font-semibold">
                Fotos seleccionadas: {selected.length}/6
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((url, index) => {
                  const active = selected.includes(url);
                  return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => toggleImage(url)}
                      className={`relative overflow-hidden rounded-lg border-2 ${active ? 'border-yellow-400' : 'border-transparent'}`}
                    >
                      <img src={url} alt={`Foto ${index + 1}`} className="h-32 w-full object-cover" />
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                        {active ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={generate}
                  className="rounded-lg bg-yellow-400 px-5 py-2 font-bold text-black"
                >
                  Obtener ficha
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
