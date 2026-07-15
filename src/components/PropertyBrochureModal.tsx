'use client';

import { useMemo, useState } from 'react';

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
  tenantName: string;
  isLight: boolean;
};

const imageUrl = (value: string | { url?: string }) => typeof value === 'string' ? value : value.url || '';
const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function addressText(address?: Record<string, unknown> | null) {
  if (!address) return '';
  return ['street', 'number', 'neighborhood', 'city']
    .map((key) => String(address[key] || '').trim()).filter(Boolean).join(' ');
}

export default function PropertyBrochureModal({ property, tenantName, isLight }: Props) {
  const images = useMemo(() => (property.images || []).map(imageUrl).filter(Boolean), [property.images]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(images.slice(0, 6));
  const [form, setForm] = useState({ fullName: '', agency: '', whatsapp: '' });
  const [error, setError] = useState('');

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
    popup.opener = null;
    popup.opener = null;
    const details = [
      property.property_type,
      property.operation_type,
      property.ambientes != null ? `${property.ambientes} ambientes` : null,
      property.bedrooms != null ? `${property.bedrooms} dormitorios` : null,
      property.bathrooms != null ? `${property.bathrooms} baños` : null,
      property.area_sqm != null ? `${property.area_sqm} m²` : null,
    ].filter(Boolean).join(' · ');
    const price = property.price != null
      ? `${property.currency || 'USD'} ${Number(property.price).toLocaleString('es-AR')}`
      : 'Consultar';
    const photos = selected.map((url, index) => `<img src="${escapeHtml(url)}" alt="Foto ${index + 1}" />`).join('');
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ficha - ${escapeHtml(property.name)}</title>
      <style>
        @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#18181b;margin:0}
        .head{border-bottom:4px solid #f4c430;padding-bottom:10px}.brand{font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:2px}
        h1{font-size:25px;margin:6px 0}.address{color:#52525b}.price{font-size:21px;font-weight:700;margin:12px 0;color:#8a6800}
        .details{font-size:13px;font-weight:600;margin-bottom:12px}.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
        .gallery img{width:100%;height:175px;object-fit:cover;border-radius:7px}.desc{font-size:12px;line-height:1.45;margin:14px 0;white-space:pre-line}
        .contact{margin-top:14px;border:2px solid #f4c430;border-radius:10px;padding:12px;background:#fffbea}
        .contact strong{font-size:16px}.legal{font-size:9px;color:#71717a;margin-top:10px}
        .actions{position:fixed;right:12px;top:12px}@media print{.actions{display:none}.gallery img{height:160px}}
      </style></head><body>
      <button class="actions" onclick="window.print()">Guardar como PDF</button>
      <section class="head"><div class="brand">Ficha comercial · ${escapeHtml(tenantName)}</div><h1>${escapeHtml(property.name)}</h1>
      <div class="address">${escapeHtml(addressText(property.address))}</div></section>
      <div class="price">${escapeHtml(price)}</div><div class="details">${escapeHtml(details)}</div>
      <section class="gallery">${photos}</section>
      <section class="desc">${escapeHtml(property.description || '')}</section>
      <section class="contact"><div>Para más información contactá a</div><strong>${escapeHtml(form.fullName)}</strong>
      <div>${escapeHtml(form.agency)}</div><div>WhatsApp: ${escapeHtml(form.whatsapp)}</div></section>
      <p class="legal">Información orientativa, sujeta a verificación y disponibilidad. Las operaciones inmobiliarias son realizadas por el corredor matriculado responsable.</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`);
    popup.document.close();
  };

  const fieldClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none ${isLight ? 'border-zinc-300 bg-white text-zinc-900' : 'border-white/15 bg-zinc-900 text-white'}`;
  return <>
    <button type="button" title="Bajar Ficha" onClick={() => setOpen(true)}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-wider transition ${isLight ? 'border-zinc-300 bg-white hover:bg-zinc-100' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M8 15h8M8 18h6"/></svg>
      Bajar ficha
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className={`max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-5 shadow-2xl ${isLight ? 'border-zinc-200 bg-white text-zinc-900' : 'border-white/15 bg-zinc-950 text-white'}`}>
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Obtener ficha PDF</h2><p className="text-sm opacity-70">Personalizala con tus datos y elegí hasta 6 fotos.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1 text-xl" aria-label="Cerrar">×</button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <input className={fieldClass} placeholder="Nombre y apellido" value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})}/>
          <input className={fieldClass} placeholder="Inmobiliaria" value={form.agency} onChange={(e)=>setForm({...form,agency:e.target.value})}/>
          <input className={fieldClass} placeholder="WhatsApp" value={form.whatsapp} onChange={(e)=>setForm({...form,whatsapp:e.target.value})}/>
        </div>
        <p className="mt-5 text-sm font-semibold">Fotos seleccionadas: {selected.length}/6</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{images.map((url, index) => {
          const active = selected.includes(url); return <button key={`${url}-${index}`} type="button" onClick={()=>toggleImage(url)} className={`relative overflow-hidden rounded-lg border-2 ${active?'border-yellow-400':'border-transparent'}`}>
            <img src={url} alt={`Foto ${index+1}`} className="h-32 w-full object-cover"/><span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">{active?'✓':'+'}</span>
          </button>;})}</div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2">Cancelar</button>
          <button type="button" onClick={generate} className="rounded-lg bg-yellow-400 px-5 py-2 font-bold text-black">Obtener ficha</button></div>
      </div>
    </div>}
  </>;
}
