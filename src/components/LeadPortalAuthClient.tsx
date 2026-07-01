'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const PORTAL_VIDEO_URL = process.env.NEXT_PUBLIC_LEAD_PORTAL_VIDEO_URL || '';
const TOKEN_KEY = 'lead_portal_token';

type Mode = 'login' | 'signup';
type SignupStep = 'identity' | 'account' | 'preferences';
type Presentation = 'page' | 'modal';

type Props = {
  mode: Mode;
  initialQuery: Record<string, string>;
  presentation?: Presentation;
  onClose?: () => void;
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

function VideoPanel({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-zinc-950 ${compact ? 'min-h-[260px]' : 'min-h-[360px] lg:min-h-[520px]'}`}>
      {PORTAL_VIDEO_URL ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={PORTAL_VIDEO_URL}
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.28),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(250,204,21,0.16),transparent_24%),linear-gradient(135deg,#0a0a0c_0%,#111827_58%,#062f3d_100%)]" />
      )}
      {!PORTAL_VIDEO_URL && (
        <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-between p-5 sm:p-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Video
          </div>
          <div>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-300 text-zinc-950 shadow-[0_0_45px_rgba(34,211,238,0.45)]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="currentColor">
                <path d="M8 5.14v13.72c0 .78.86 1.25 1.52.82l10.29-6.86a.98.98 0 0 0 0-1.64L9.52 4.32A.98.98 0 0 0 8 5.14Z" />
              </svg>
            </div>
            <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Tu panel de busqueda, explicado en menos de un minuto.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-300">
              Este espacio queda listo para el video alojado en Bunny.Net con los beneficios del registro gratuito.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Progress({ step }: { step: SignupStep }) {
  const steps: SignupStep[] = ['identity', 'account', 'preferences'];
  const activeIndex = steps.indexOf(step);
  return (
    <div className="grid grid-cols-3 gap-2" aria-hidden="true">
      {steps.map((item, index) => (
        <span
          key={item}
          className={`h-1.5 rounded-full transition ${index <= activeIndex ? 'bg-cyan-300' : 'bg-white/10'}`}
        />
      ))}
    </div>
  );
}

export default function LeadPortalAuthClient({
  mode,
  initialQuery,
  presentation = 'page',
  onClose,
}: Props) {
  const [activeMode, setActiveMode] = useState<Mode>(mode);
  const [signupStep, setSignupStep] = useState<SignupStep>('identity');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [leadIntent, setLeadIntent] = useState('');
  const [operationType, setOperationType] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const context = useMemo(() => contextFromQuery(initialQuery), [initialQuery]);
  const nextHref = context.next || '/perfil-lead/panel';
  const alternateHref = buildModeHref(activeMode === 'login' ? 'signup' : 'login', initialQuery);
  const missingTenant = !context.tenant_slug;
  const isModal = presentation === 'modal';
  const isSignup = activeMode === 'signup';
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveMode(mode);
    setSignupStep('identity');
    setError(null);
  }, [mode]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || activeMode !== 'login') return;
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
  }, [activeMode]);

  useEffect(() => {
    if (!googleReady || activeMode !== 'login' || !GOOGLE_CLIENT_ID || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }
    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        if (!response.credential) {
          setError('No pudimos iniciar sesion con Google.');
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
  }, [googleReady, activeMode]);

  const persistAndRedirect = (payload: { access_token?: string; next?: string }) => {
    if (payload.access_token) {
      window.localStorage.setItem(TOKEN_KEY, payload.access_token);
    }
    window.location.href = payload.next || nextHref || '/perfil-lead/panel';
  };

  const submitGoogle = async (idToken: string) => {
    if (missingTenant) {
      setError('Falta el contexto del portfolio. Volve a entrar desde la propiedad o portfolio.');
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
        throw new Error(payload?.detail || 'No pudimos iniciar sesion con Google.');
      }
      persistAndRedirect(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesion con Google.');
    } finally {
      setLoading(false);
    }
  };

  const preferenceNotes = [
    leadIntent ? `Interes: ${leadIntent}` : '',
    operationType ? `Operacion: ${operationType}` : '',
    propertyAddress ? `Direccion: ${propertyAddress}` : '',
  ].filter(Boolean).join('\n');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (missingTenant) {
      setError('Falta el contexto del portfolio. Volve a entrar desde la propiedad o portfolio.');
      return;
    }
    if (isSignup && signupStep !== 'preferences') {
      if (signupStep === 'identity') setSignupStep('account');
      if (signupStep === 'account') setSignupStep('preferences');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        activeMode === 'login'
          ? `${BACKEND_URL}/api/portal/auth/login-from-landing`
          : `${BACKEND_URL}/api/portal/auth/signup-from-landing`;
      const body =
        activeMode === 'login'
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
              full_name: fullName,
              phone: phone.trim(),
              lead_intent: leadIntent || undefined,
              operation_type: operationType || undefined,
              property_address: propertyAddress.trim() || undefined,
              notes: preferenceNotes || undefined,
              page_url: window.location.href,
            };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || 'No pudimos completar la operacion.');
      }
      persistAndRedirect(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos completar la operacion.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setActiveMode(nextMode);
    setSignupStep('identity');
    setError(null);
  };

  const goBack = () => {
    if (signupStep === 'account') setSignupStep('identity');
    if (signupStep === 'preferences') setSignupStep('account');
  };

  const formTitle = activeMode === 'login' ? 'Volver a mi panel' : 'Crear mi panel gratis';
  const formSubtitle =
    activeMode === 'login'
      ? 'Ingresa con tu email o Google si ya registraste tus datos.'
      : signupStep === 'identity'
      ? 'Primero protegemos tu REF y asociamos tus datos basicos.'
      : signupStep === 'account'
      ? 'Ahora crea el acceso para volver cuando quieras.'
      : 'Si queres, dejanos una senal para personalizar alertas y seguimiento.';

  const authForm = (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            {activeMode === 'login' ? 'Ingresar' : 'Registro gratuito'}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{formTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{formSubtitle}</p>
        </div>
        {isModal && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isSignup && (
        <div className="mt-5">
          <Progress step={signupStep} />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4">
        {activeMode === 'signup' && signupStep === 'identity' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-100">
              Nombre
              <input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none transition focus:border-cyan-300"
              />
            </label>
            <label className="block text-sm text-zinc-100">
              Apellido
              <input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none transition focus:border-cyan-300"
              />
            </label>
            <label className="block text-sm text-zinc-100 sm:col-span-2">
              WhatsApp
              <input
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none transition focus:border-cyan-300"
                placeholder="+54 9 ..."
              />
            </label>
          </div>
        )}

        {(activeMode === 'login' || signupStep === 'account') && (
          <>
            <label className="block text-sm text-zinc-100">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none transition focus:border-cyan-300"
              />
            </label>
            <label className="block text-sm text-zinc-100">
              Contrasena
              <input
                required
                type="password"
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none transition focus:border-cyan-300"
              />
            </label>
          </>
        )}

        {activeMode === 'signup' && signupStep === 'preferences' && (
          <div className="space-y-3">
            <fieldset>
              <legend className="text-sm text-zinc-100">Que necesitas?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  ['search', 'Busco'],
                  ['offer', 'Ofrezco'],
                  ['both', 'Ambos'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLeadIntent(value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      leadIntent === value
                        ? 'border-cyan-300 bg-cyan-300 text-zinc-950'
                        : 'border-white/10 bg-black/20 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm text-zinc-100">
              Tipo de operacion
              <select
                value={operationType}
                onChange={(event) => setOperationType(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300"
              >
                <option value="">Sin definir todavia</option>
                <option value="compra">Compra</option>
                <option value="venta">Venta</option>
                <option value="dar_en_alquiler">Dar en alquiler</option>
                <option value="alquilar">Alquilar</option>
              </select>
            </label>

            <label className="block text-sm text-zinc-100">
              Direccion de la propiedad
              <input
                value={propertyAddress}
                onChange={(event) => setPropertyAddress(event.target.value)}
                autoComplete="street-address"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none transition focus:border-cyan-300"
                placeholder="Calle, numero, ciudad"
              />
            </label>
          </div>
        )}

        <div className="flex gap-3">
          {isSignup && signupStep !== 'identity' && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-200 transition hover:bg-white/10"
              aria-label="Volver"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m7-7-7 7 7 7" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-11 flex-1 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Procesando...'
              : activeMode === 'login'
              ? 'Ingresar'
              : signupStep === 'preferences'
              ? 'Crear mi panel'
              : 'Continuar'}
          </button>
        </div>
      </form>

      {activeMode === 'login' && GOOGLE_CLIENT_ID && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-3 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-white/10" />
            <span>o con Google</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div ref={googleButtonRef} className="flex justify-center" />
        </div>
      )}

      <p className="mt-5 text-center text-sm text-zinc-400">
        {activeMode === 'login' ? 'Todavia no tenes panel?' : 'Ya tenes panel?'}{' '}
        {isModal ? (
          <button
            type="button"
            onClick={() => switchMode(activeMode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {activeMode === 'login' ? 'Registrarme' : 'Ingresar'}
          </button>
        ) : (
          <Link href={alternateHref} className="font-semibold text-cyan-300 transition hover:text-cyan-200">
            {activeMode === 'login' ? 'Registrarme' : 'Ingresar'}
          </Link>
        )}
      </p>
    </section>
  );

  const content = (
    <div className={isModal ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]' : 'mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px]'}>
      <div className={isModal ? 'hidden lg:block' : 'space-y-5'}>
        {!isModal && (
          <Link href="/" className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            ShowtimeProp
          </Link>
        )}
        <VideoPanel compact={isModal} />
      </div>
      {authForm}
    </div>
  );

  if (isModal) {
    if (!mounted) return null;
    return createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/72 px-3 py-4 backdrop-blur-sm sm:px-5"
        style={{ zIndex: 2147483647, isolation: 'isolate' }}
      >
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-3 sm:p-4">
            <div className="lg:hidden">
              <VideoPanel compact />
            </div>
            <div className="mt-3 lg:mt-0">{content}</div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      {content}
    </main>
  );
}
