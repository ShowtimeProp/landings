'use client';

import { useEffect, useMemo, useState } from 'react';

type DeviceType = 'ios' | 'android' | 'other';

function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'other';
}

export default function VcardGatewayClient({ slug }: { slug: string }) {
  const [device, setDevice] = useState<DeviceType>('other');
  const downloadUrl = useMemo(
    () => `/vcard-file/${encodeURIComponent(String(slug || '').trim())}.vcf`,
    [slug]
  );

  useEffect(() => {
    const detected = detectDevice();
    setDevice(detected);
    if (detected !== 'ios') return;
    const timer = window.setTimeout(() => {
      window.location.href = downloadUrl;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [downloadUrl]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-700/90 bg-zinc-900/70 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">E-Card</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Guardar contacto</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Esta tarjeta detecta tu dispositivo para facilitar la importación del contacto.
        </p>

        <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950/70 p-4 text-sm text-zinc-300">
          {device === 'ios' ? (
            <p>Detectamos iPhone/iPad. Estamos abriendo el archivo de contacto automáticamente.</p>
          ) : device === 'android' ? (
            <>
              <p className="font-medium text-zinc-100">Detectamos Android.</p>
              <p className="mt-1">
                Descargá el archivo <code className="rounded bg-zinc-800 px-1 py-0.5">.vcf</code> y abrilo desde
                Descargas con la app de Contactos.
              </p>
            </>
          ) : (
            <p>Si tu dispositivo no abre el contacto automáticamente, usá el botón de descarga.</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={downloadUrl}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Descargar contacto (.vcf)
          </a>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          >
            Abrir archivo
          </a>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Si ya tenías el contacto guardado, puede que tu teléfono mantenga la versión anterior de la foto.
        </p>
      </div>
    </main>
  );
}
