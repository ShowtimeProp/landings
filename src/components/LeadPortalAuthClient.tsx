'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const TOKEN_KEY = 'lead_portal_token';

type Mode = 'login' | 'signup';

type Props = {
  mode: Mode;
  initialQuery: Record<string, string>;
};

type GoogleAccounts = {
  id: {
    initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
    renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
  };
};

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts };
  }
}

function clean(value?: string | null): string {
  return String(value || '').trim();
}

function contextFromQuery(query: Record<string, string>) {
  const campaign: Record<string, string> = {};
  [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'marketing_campaign_id',
    'variant_id',
    'fbclid',
    'gclid',
    'gbraid',
    'wbraid',
  ].forEach((key) => {
    if (query[key]) campaign[key] = query[key];
  });
  return {
    tenant_slug: clean(query.tenant_slug),
    property_id: clean(query.property_id) || null,
    ref: clean(query.ref) || null,
    next: clean(query.next) || '/perfil-lead/panel',
    campaign,
    save_favorite: Boolean(clean(query.property_id)),
  };
}

function buildModeHref(mode: Mode, query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return `/perfil-lead/${mode === 'login' ? 'login' : 'registro'}?${params.toString()}`;
}

export default function LeadPortalAuthClient({ mode, initialQuery }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const context = useMemo(() => contextFromQuery(initialQuery), [initialQuery]);
  const nextHref = context.next || '/perfil-lead/panel';
  const alternateHref = buildModeHref(mode === 'login' ? 'signup' : 'login', initialQuery);
  const missingTenant = !context.tenant_slug;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode !== 'login') return;
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existing) {
      setGoogleReady(Boolean(window.google?.accounts?.id));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
  }, [mode]);

  useEffect(() => {
    if (!googleReady || mode !== 'login' || !GOOGLE_CLIENT_ID || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }
    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        if (!response.credential) {
          setError('No pudimos iniciar sesión con Google.');
          return;
        }
        await submitGoogle(response.credential);
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 320,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, mode]);

  const persistAndRedirect = (payload: { access_token?: string; next?: string }) => {
    if (payload.access_token) {
      window.localStorage.setItem(TOKEN_KEY, payload.access_token);
    }
    window.location.href = payload.next || nextHref || '/perfil-lead/panel';
  };

  const submitGoogle = async (idToken: string) => {
    if (missingTenant) {
      setError('Falta el contexto del portfolio. Volvé a entrar desde la propiedad o portfolio.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/portal/auth/google-login-from-landing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          id_token: idToken,
          page_url: window.location.href,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'No pudimos iniciar sesión con Google.');
      }
      persistAndRedirect(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (missingTenant) {
      setError('Falta el contexto del portfolio. Volvé a entrar desde la propiedad o portfolio.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === 'login'
          ? `${BACKEND_URL}/api/portal/auth/login-from-landing`
          : `${BACKEND_URL}/api/portal/auth/signup-from-landing`;
      const body =
        mode === 'login'
          ? {
              ...context,
              email: email.trim().toLowerCase(),
              password,
              page_url: window.location.href,
            }
          : {
              ...context,
              email: email.trim().toLowerCase(),
              password,
              full_name: fullName.trim(),
              phone: phone.trim(),
              page_url: window.location.href,
            };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'No pudimos completar la operación.');
      }
      persistAndRedirect(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos completar la operación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <Link href="/" className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            ShowtimeProp
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Panel personal de búsqueda
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Ordená tus propiedades, visitas y alertas en un solo lugar.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
              Guardá favoritos, seguí tus citas presenciales o virtuales, dejá comentarios de cada visita y activá alertas con tu criterio de búsqueda.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Favoritos', 'Usá el corazón de cada card para armar tu lista corta.'],
              ['Citas', 'Revisá horarios, estado y enlaces de videollamada.'],
              ['Alertas', 'Definí qué buscás para recibir mejores matches.'],
            ].map(([title, text]) => (
              <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-zinc-400">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              {mode === 'login' ? 'Ingresar' : 'Registrarme'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {mode === 'login' ? 'Volvé a tu panel' : 'Creá tu panel personalizado'}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {mode === 'login'
                ? 'Ingresá con tu email o Google si ya tenés tu panel.'
                : 'Primero cargamos tus datos para crear el lead formal y respetar el REF de entrada.'}
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === 'signup' && (
              <>
                <label className="block text-sm">
                  Nombre completo
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  />
                </label>
                <label className="block text-sm">
                  WhatsApp
                  <input
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                    placeholder="+54 9 ..."
                  />
                </label>
              </>
            )}
            <label className="block text-sm">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
              />
            </label>
            <label className="block text-sm">
              Contraseña
              <input
                required
                type="password"
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear mi panel'}
            </button>
          </form>

          {mode === 'login' && GOOGLE_CLIENT_ID && (
            <div className="mt-4">
              <div ref={googleButtonRef} className="flex justify-center" />
            </div>
          )}

          <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-50">
            {mode === 'login'
              ? 'Tip: usá este ingreso desde cualquier portfolio del tenant o de un seller para volver a tu panel.'
              : 'Tip: el primer REF por el que consultaste queda protegido si luego fusionás tus conversaciones anteriores.'}
          </div>

          <p className="mt-4 text-center text-sm text-zinc-400">
            {mode === 'login' ? '¿Todavía no tenés panel?' : '¿Ya tenés panel?'}{' '}
            <Link href={alternateHref} className="font-semibold text-cyan-300 hover:text-cyan-200">
              {mode === 'login' ? 'Registrarme' : 'Ingresar'}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
