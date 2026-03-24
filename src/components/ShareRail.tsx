'use client';

import { useMemo, useState } from 'react';
import { SocialNetworkIcon } from './social-links';

type ThemeMode = 'light' | 'soft' | 'dark';

type ShareAction = {
  key: 'whatsapp' | 'telegram' | 'facebook' | 'linkedin' | 'x' | 'copy';
  label: string;
  hoverColorClass: string;
  buildUrl?: (url: string, text: string) => string;
};

const SHARE_ACTIONS: ShareAction[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    hoverColorClass: 'hover:text-emerald-400',
    buildUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    hoverColorClass: 'hover:text-cyan-400',
    buildUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    hoverColorClass: 'hover:text-blue-500',
    buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    hoverColorClass: 'hover:text-sky-400',
    buildUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: 'x',
    label: 'X',
    hoverColorClass: 'hover:text-zinc-100',
    buildUrl: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  { key: 'copy', label: 'Copiar link', hoverColorClass: 'hover:text-amber-300' },
];

function getShareIconClass(themeMode: ThemeMode): string {
  if (themeMode === 'light') return 'border-zinc-300 bg-zinc-100 text-zinc-600 hover:border-zinc-400';
  if (themeMode === 'soft') return 'border-slate-600 bg-slate-900/90 text-zinc-300 hover:border-slate-400';
  return 'border-zinc-700 bg-zinc-950/90 text-zinc-300 hover:border-zinc-500';
}

function ShareGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.6 10.8l6.8-4.3M8.6 13.2l6.8 4.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CopyGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 14H5a2 2 0 01-2-2V5a2 2 0 012-2h7a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function WhatsappGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4a8 8 0 00-6.9 12.1L4 20l4.1-1.1A8 8 0 1012 4z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.7 9.3c.2-.5.5-.5.7-.5h.6c.2 0 .4 0 .5.4l.5 1.3c.1.3 0 .5-.1.7l-.4.5c-.2.2-.2.4 0 .6l.2.3c.5.8 1.2 1.4 2 1.8.3.2.5.1.7 0l.5-.5c.2-.2.4-.2.6-.1l1.2.6c.4.2.4.3.3.6l-.2.8c-.1.3-.2.4-.4.5-.4.2-1 .3-1.6.1-1.1-.3-2.1-.9-3.1-1.9-1-1-1.6-2-1.9-3.1-.2-.6-.1-1.2.1-1.6z" fill="currentColor" />
    </svg>
  );
}

function openSharePopup(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=900,height=640');
}

export default function ShareRail({
  themeMode,
  shareTitle = 'Mirá esta propiedad',
}: {
  themeMode: ThemeMode;
  shareTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const iconClass = useMemo(() => getShareIconClass(themeMode), [themeMode]);

  const getCurrentUrl = () => (typeof window !== 'undefined' ? window.location.href : '');

  const handleAction = async (action: ShareAction) => {
    const currentUrl = getCurrentUrl();
    if (!currentUrl) return;

    if (action.key === 'copy') {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        // silent
      }
      return;
    }

    if (!action.buildUrl) return;
    const targetUrl = action.buildUrl(currentUrl, shareTitle);
    openSharePopup(targetUrl);
  };

  return (
    <div className="pointer-events-auto fixed left-0 z-[70] max-sm:bottom-24 max-sm:top-auto max-sm:translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
      <div className={`flex items-center transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-[calc(100%-2.8rem)]'}`}>
        <div
          className={`rounded-r-xl border-r border-y p-2 shadow-xl backdrop-blur ${
            themeMode === 'light'
              ? 'border-zinc-300 bg-white/95'
              : themeMode === 'soft'
              ? 'border-slate-600 bg-slate-900/92'
              : 'border-zinc-700 bg-zinc-950/92'
          }`}
        >
          <div className="flex flex-col gap-2">
            {SHARE_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                title={action.label}
                aria-label={action.label}
                onClick={() => void handleAction(action)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition duration-300 ${iconClass} ${action.hoverColorClass}`}
              >
                {action.key === 'copy' ? (
                  <CopyGlyph className="h-5 w-5" />
                ) : action.key === 'whatsapp' ? (
                  <WhatsappGlyph className="h-5 w-5" />
                ) : action.key === 'x' ? (
                  <SocialNetworkIcon network="x" className="h-5 w-5" />
                ) : (
                  <SocialNetworkIcon
                    network={action.key as 'telegram' | 'facebook' | 'linkedin'}
                    className="h-5 w-5"
                  />
                )}
              </button>
            ))}
          </div>
          {copied && (
            <p className="mt-2 max-w-[82px] text-[10px] leading-tight text-emerald-400">
              Link copiado
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Cerrar compartir' : 'Abrir compartir'}
          title="Compartir"
          className="group relative inline-flex h-11 w-11 items-center justify-center rounded-r-xl border border-l-0 border-green-600 bg-green-600 text-white shadow-[0_0_18px_rgba(34,197,94,0.30)] transition duration-300 hover:bg-green-500 hover:border-green-500 hover:shadow-[0_0_28px_rgba(34,197,94,0.50)]"
        >
          <ShareGlyph className="h-5 w-5" />
          <span className="pointer-events-none absolute left-full ml-2 rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            Compartir
          </span>
        </button>
      </div>
    </div>
  );
}
