'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LeadPortalAuthClient from '@/components/LeadPortalAuthClient';

type Mode = 'login' | 'signup';
const TOKEN_KEY = 'lead_portal_token';
const ACCOUNT_KEY = 'lead_portal_account';
const AUTH_EVENT = 'lead-portal-auth-changed';

type Props = {
  query: Record<string, string>;
  isLight?: boolean;
};

export default function LeadPortalAuthLauncher({ query, isLight = false }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountLabel, setAccountLabel] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncSession = () => {
      const token = window.localStorage.getItem(TOKEN_KEY);
      setIsLoggedIn(Boolean(token));
      try {
        const account = JSON.parse(window.localStorage.getItem(ACCOUNT_KEY) || '{}') as { full_name?: string; email?: string };
        setAccountLabel(account.full_name || account.email || '');
      } catch {
        setAccountLabel('');
      }
    };
    syncSession();
    window.addEventListener(AUTH_EVENT, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(AUTH_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ACCOUNT_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
    setProfileOpen(false);
  };

  const navClass = `flex items-center gap-1 rounded-full p-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${
    isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/15 bg-white/5'
  }`;
  const ghostButtonClass = `rounded-full px-2.5 py-1 transition ${isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'}`;

  return (
    <>
      <nav
        className={navClass}
        aria-label="Acceso del comprador"
      >
        {isLoggedIn ? (
          <>
            <button type="button" onClick={() => setProfileOpen(true)} className={ghostButtonClass} title={accountLabel || 'Mi perfil'}>
              Mi Perfil
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full bg-white px-2.5 py-1 text-zinc-800 shadow-sm transition hover:bg-zinc-100"
            >
              Salir
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={ghostButtonClass}
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
          </>
        )}
      </nav>

      {mode && mounted
        ? createPortal(
            <LeadPortalAuthClient
              mode={mode}
              initialQuery={query}
              presentation="modal"
              theme={isLight ? 'light' : 'dark'}
              onClose={() => setMode(null)}
              onAuthenticated={() => setMode(null)}
            />,
            document.body
          )
        : null}

      {profileOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:px-5" style={{ zIndex: 2147483647, isolation: 'isolate' }}>
              <div className={`flex h-[min(92vh,860px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border shadow-2xl ${isLight ? 'border-zinc-200 bg-white' : 'border-white/10 bg-zinc-950'}`}>
                <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${isLight ? 'border-zinc-200 text-zinc-950' : 'border-white/10 text-zinc-100'}`}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Panel personal</p>
                    <h2 className="text-lg font-semibold">{accountLabel || 'Mi Perfil'}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${isLight ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    aria-label="Cerrar perfil"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <iframe src="/perfil-lead/panel" title="Mi Perfil" className="min-h-0 flex-1 border-0" />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
