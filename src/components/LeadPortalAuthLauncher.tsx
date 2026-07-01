'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LeadPortalAuthClient from '@/components/LeadPortalAuthClient';

type Mode = 'login' | 'signup';

type Props = {
  query: Record<string, string>;
  isLight?: boolean;
};

export default function LeadPortalAuthLauncher({ query, isLight = false }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <nav
        className={`flex items-center gap-1 rounded-full p-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${
          isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/15 bg-white/5'
        }`}
        aria-label="Acceso del comprador"
      >
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-full px-2.5 py-1 transition ${isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'}`}
        >
          Ingresar
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="rounded-full bg-white px-2.5 py-1 text-zinc-800 shadow-sm transition hover:bg-zinc-100"
        >
          Registrarme
        </button>
      </nav>

      {mode && mounted
        ? createPortal(
            <LeadPortalAuthClient
              mode={mode}
              initialQuery={query}
              presentation="modal"
              theme={isLight ? 'light' : 'dark'}
              onClose={() => setMode(null)}
            />,
            document.body
          )
        : null}
    </>
  );
}
