'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PORTAL_API_BASE = '/api/portal';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const PORTAL_VIDEO_URL = process.env.NEXT_PUBLIC_LEAD_PORTAL_VIDEO_URL || '';
const TOKEN_KEY = 'lead_portal_token';

type Mode = 'login' | 'signup';
type SignupStep = 'identity' | 'account' | 'preferences';
type Presentation = 'page' | 'modal';
type PortalTheme = 'dark' | 'light';
type AuthView = 'auth' | 'forgot';

type Props = {
  mode: Mode;
  initialQuery: Record<string, string>;
  presentation?: Presentation;
  onClose?: () => void;
  theme?: PortalTheme;
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

const OPERATION_OPTIONS = [
  ['comprar', 'Comprar'],
  ['vender', 'Vender'],
  ['dar_en_alquiler', 'Dar en Alquiler'],
  ['alquilar_largo_plazo', 'Alquilar Largo Plazo'],
  ['alquiler_vacacional', 'Alquiler Vacacional'],
  ['multiples_operaciones', 'Multiples Operaciones'],
];

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

function passwordPolicyMessage(value: string): string | null {
  const password = String(value || '');
  if (password.length < 10) return 'Usá al menos 10 caracteres.';
  if (!/[A-Za-z]/.test(password)) return 'Incluí al menos una letra.';
  if (!/\d/.test(password)) return 'Incluí al menos un número.';
  return null;
}

function EyeIcon({ off = false }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
      <path d="M9.88 4.24A9.3 9.3 0 0 1 12 4c5 0 8.5 4.5 10 8a13.6 13.6 0 0 1-3.1 4.42" />
      <path d="M6.1 6.1A13.4 13.4 0 0 0 2 12c1.5 3.5 5 8 10 8a9.7 9.7 0 0 0 4.28-1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
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
          className={`h-1.5 rounded-full transition ${index <= activeIndex ? 'bg-cyan-300' : 'bg-current opacity-15'}`}
        />
      ))}
    </div>
  );
}

function VideoPanel({ compact = false, theme = 'dark' }: { compact?: boolean; theme?: PortalTheme }) {
  const isLight = theme === 'light';
  return (
    <section
      className={`relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[2rem] border shadow-2xl ${
        compact ? 'max-w-[240px]' : 'max-w-[340px]'
      } ${
        isLight
          ? 'border-zinc-200 bg-white text-zinc-950 shadow-zinc-900/10'
          : 'border-cyan-300/20 bg-zinc-950 text-white shadow-black/35'
      }`}
    >
      {PORTAL_VIDEO_URL ? (
        <video className="absolute inset-0 h-full w-full object-cover" src={PORTAL_VIDEO_URL} controls playsInline preload="metadata" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.28),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(250,204,21,0.16),transparent_24%),linear-gradient(135deg,#0a0a0c_0%,#111827_58%,#062f3d_100%)]" />
      )}
      {!PORTAL_VIDEO_URL && (
        <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Video
          </div>
          <div>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-300 text-zinc-950 shadow-[0_0_45px_rgba(34,211,238,0.45)]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill="currentColor">
                <path d="M8 5.14v13.72c0 .78.86 1.25 1.52.82l10.29-6.86a.98.98 0 0 0 0-1.64L9.52 4.32A.98.98 0 0 0 8 5.14Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tu panel de busqueda, explicado en menos de un minuto.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Este espacio queda listo para tu video vertical 9:16 alojado en Bunny.Net.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function LeadPortalAuthClient({
  mode,
  initialQuery,
  presentation = 'page',
  onClose,
  theme = 'dark',
}: Props) {
  const [activeMode, setActiveMode] = useState<Mode>(mode);
  const [authView, setAuthView] = useState<AuthView>('auth');
  const [signupStep, setSignupStep] = useState<SignupStep>('identity');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [operationType, setOperationType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
  const isLight = theme === 'light';
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const shellClass = isLight ? 'bg-white text-zinc-950' : 'bg-zinc-950 text-zinc-100';
  const panelClass = isLight
    ? 'border-zinc-200 bg-white/72 text-zinc-950 shadow-zinc-900/10'
    : 'border-white/10 bg-white/[0.06] text-zinc-100 shadow-black/35';
  const inputClass = isLight
    ? 'border-zinc-200 bg-white/70 text-zinc-950 placeholder:text-zinc-400 focus:border-cyan-500'
    : 'border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300';
  const subtleClass = isLight ? 'text-zinc-600' : 'text-zinc-400';
  const pillClass = isLight
    ? 'rounded-full border border-white/70 bg-white/45 text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white/75'
    : 'rounded-full border border-white/12 bg-white/8 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:bg-white/14';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveMode(mode);
    setAuthView('auth');
    setSignupStep('identity');
    setError(null);
    setNotice(null);
  }, [mode]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || activeMode !== 'login' || authView !== 'auth') return;
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
  }, [activeMode, authView]);

  useEffect(() => {
    if (!googleReady || activeMode !== 'login' || authView !== 'auth' || !GOOGLE_CLIENT_ID || !googleButtonRef.current || !window.google?.accounts?.id) {
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
      theme: isLight ? 'outline' : 'filled_black',
      size: 'large',
      text: 'signin_with',
      width: 320,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, activeMode, authView, isLight]);

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
      const response = await fetch(`${PORTAL_API_BASE}/auth/google-login-from-landing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...context, id_token: idToken, page_url: window.location.href }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || 'No pudimos iniciar sesion con Google.');
      persistAndRedirect(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos iniciar sesion con Google.';
      setError(message === 'Failed to fetch' ? 'No pudimos conectar con el servidor. Probá de nuevo en unos segundos.' : message);
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${PORTAL_API_BASE}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || 'No pudimos enviar el enlace.');
      setNotice(payload?.message || 'Si el email existe, te enviamos un enlace para restablecer la contraseña.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos enviar el enlace.';
      setError(message === 'Failed to fetch' ? 'No pudimos conectar con el servidor. Probá de nuevo en unos segundos.' : message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authView === 'forgot') {
      await submitForgot();
      return;
    }
    if (missingTenant) {
      setError('Falta el contexto del portfolio. Volve a entrar desde la propiedad o portfolio.');
      return;
    }
    if (isSignup && signupStep !== 'preferences') {
      if (signupStep === 'identity') setSignupStep('account');
      if (signupStep === 'account') {
        const policyError = passwordPolicyMessage(password);
        if (policyError) {
          setError(policyError);
          return;
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        setSignupStep('preferences');
      }
      return;
    }
    if (isSignup) {
      const policyError = passwordPolicyMessage(password);
      if (policyError) {
        setError(policyError);
        return;
      }
    }
    if (isSignup && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        activeMode === 'login'
          ? `${PORTAL_API_BASE}/auth/login-from-landing`
          : `${PORTAL_API_BASE}/auth/signup-from-landing`;
      const body =
        activeMode === 'login'
          ? { ...context, email: email.trim().toLowerCase(), password, page_url: window.location.href }
          : {
              ...context,
              email: email.trim().toLowerCase(),
              password,
              full_name: fullName,
              phone: phone.trim(),
              operation_type: operationType || undefined,
              notes: operationType ? `Operacion: ${operationType}` : undefined,
              page_url: window.location.href,
            };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && activeMode === 'signup') {
          throw new Error('Ya hay un panel con ese email. Ingresá con tu contraseña o usá recuperar contraseña.');
        }
        throw new Error(payload?.detail || 'No pudimos completar la operacion.');
      }
      persistAndRedirect(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos completar la operacion.';
      setError(message === 'Failed to fetch' ? 'No pudimos conectar con el servidor. Probá de nuevo en unos segundos.' : message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setActiveMode(nextMode);
    setAuthView('auth');
    setSignupStep('identity');
    setError(null);
    setNotice(null);
  };

  const goBack = () => {
    setError(null);
    if (authView === 'forgot') {
      setAuthView('auth');
      return;
    }
    if (signupStep === 'account') setSignupStep('identity');
    if (signupStep === 'preferences') setSignupStep('account');
  };

  const formTitle = authView === 'forgot' ? 'Recuperar contraseña' : activeMode === 'login' ? 'Volver a mi panel' : 'Crear mi perfil gratis';
  const formSubtitle =
    authView === 'forgot'
      ? 'Te enviamos un enlace seguro para definir una nueva contraseña.'
      : activeMode === 'login'
      ? 'Ingresa con tu email o Google si ya registraste tus datos.'
      : signupStep === 'identity'
      ? 'Herramientas, info e IA para acompañarte y que no se te pase nada.'
      : signupStep === 'account'
      ? 'Ahora crea el acceso para volver cuando quieras.'
      : 'Elegí qué operación te interesa para personalizar el seguimiento.';

  const passwordField = (
    <label className="block text-sm">
      Contrasena
      <div className="relative mt-1">
        <input
          required
          type={showPassword ? 'text' : 'password'}
          minLength={10}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (error) setError(null);
          }}
          autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
          className={`w-full rounded-2xl border px-3 py-3 pr-12 text-sm outline-none transition ${inputClass}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${subtleClass}`}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
        >
          <EyeIcon off={showPassword} />
        </button>
      </div>
      {activeMode === 'signup' && (
        <p className={`mt-2 text-xs leading-5 ${subtleClass}`}>
          Debe tener al menos 10 caracteres e incluir letras y números.
        </p>
      )}
    </label>
  );

  const authForm = (
    <section className={`rounded-[1.75rem] border p-5 shadow-2xl backdrop-blur-2xl sm:p-6 ${panelClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            {authView === 'forgot' ? 'Acceso' : activeMode === 'login' ? 'Ingresar' : 'Registro gratuito'}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{formTitle}</h1>
          <p className={`mt-2 text-sm leading-6 ${subtleClass}`}>{formSubtitle}</p>
        </div>
        {isModal && (
          <button type="button" onClick={onClose} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center ${pillClass}`} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isSignup && authView === 'auth' && (
        <div className="mt-5">
          <Progress step={signupStep} />
        </div>
      )}

      {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      {notice && <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</div>}

      <form onSubmit={submit} className="mt-5 space-y-4">
        {activeMode === 'signup' && signupStep === 'identity' && authView === 'auth' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Nombre
              <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm outline-none transition ${inputClass}`} />
            </label>
            <label className="block text-sm">
              Apellido
              <input required value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm outline-none transition ${inputClass}`} />
            </label>
            <label className="block text-sm sm:col-span-2">
              WhatsApp
              <input required value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" placeholder="+54 9 ..." className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm outline-none transition ${inputClass}`} />
            </label>
          </div>
        )}

        {(activeMode === 'login' || signupStep === 'account' || authView === 'forgot') && (
          <>
            <label className="block text-sm">
              Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm outline-none transition ${inputClass}`} />
            </label>
            {authView === 'auth' && passwordField}
            {activeMode === 'signup' && signupStep === 'account' && authView === 'auth' && (
              <label className="block text-sm">
                Confirmar contrasena
                <div className="relative mt-1">
                  <input required type={showConfirmPassword ? 'text' : 'password'} minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className={`w-full rounded-2xl border px-3 py-3 pr-12 text-sm outline-none transition ${inputClass}`} />
                  <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${subtleClass}`} aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}>
                    <EyeIcon off={showConfirmPassword} />
                  </button>
                </div>
              </label>
            )}
          </>
        )}

        {activeMode === 'signup' && signupStep === 'preferences' && authView === 'auth' && (
          <label className="block text-sm">
            Tipo de operacion
            <select value={operationType} onChange={(event) => setOperationType(event.target.value)} className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm outline-none transition ${inputClass}`}>
              <option value="">Seleccionar</option>
              {OPERATION_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}

        <div className="flex gap-3">
          {((isSignup && signupStep !== 'identity') || authView === 'forgot') && (
            <button type="button" onClick={goBack} className={`inline-flex h-12 w-14 shrink-0 items-center justify-center ${pillClass}`} aria-label="Volver">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m7-7-7 7 7 7" />
              </svg>
            </button>
          )}
          <button type="submit" disabled={loading} className="h-12 flex-1 rounded-full border border-cyan-200/60 bg-cyan-300/90 px-5 text-sm font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_16px_36px_rgba(34,211,238,0.24)] backdrop-blur-xl transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Procesando...' : authView === 'forgot' ? 'Enviar enlace' : activeMode === 'login' ? 'Ingresar' : signupStep === 'preferences' ? 'Crear mi panel' : 'Continuar'}
          </button>
        </div>
      </form>

      {activeMode === 'login' && authView === 'auth' && (
        <button type="button" onClick={() => { setAuthView('forgot'); setError(null); setNotice(null); }} className="mt-3 text-sm font-semibold text-cyan-400 transition hover:text-cyan-300">
          Olvide mi contrasena
        </button>
      )}

      {activeMode === 'login' && authView === 'auth' && GOOGLE_CLIENT_ID && (
        <div className="mt-4">
          <div className={`mb-3 flex items-center gap-3 text-xs ${subtleClass}`}>
            <span className="h-px flex-1 bg-current opacity-15" />
            <span>o con Google</span>
            <span className="h-px flex-1 bg-current opacity-15" />
          </div>
          <div ref={googleButtonRef} className="flex justify-center" />
        </div>
      )}

      {authView === 'auth' && (
        <p className={`mt-5 text-center text-sm ${subtleClass}`}>
          {activeMode === 'login' ? 'Todavia no tenes panel?' : 'Ya tenes panel?'}{' '}
          {isModal ? (
            <button type="button" onClick={() => switchMode(activeMode === 'login' ? 'signup' : 'login')} className="font-semibold text-cyan-400 transition hover:text-cyan-300">
              {activeMode === 'login' ? 'Registrarme' : 'Ingresar'}
            </button>
          ) : (
            <Link href={alternateHref} className="font-semibold text-cyan-400 transition hover:text-cyan-300">
              {activeMode === 'login' ? 'Registrarme' : 'Ingresar'}
            </Link>
          )}
        </p>
      )}
    </section>
  );

  const content = (
    <div className={isModal ? 'grid items-center gap-5 lg:grid-cols-[minmax(260px,0.9fr)_420px]' : 'mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-6 lg:grid-cols-[minmax(260px,0.9fr)_420px]'}>
      <div className={isModal ? 'hidden lg:flex lg:justify-center' : 'flex flex-col items-center gap-5'}>
        {!isModal && (
          <Link href="/" className="inline-flex text-sm font-semibold text-cyan-400 hover:text-cyan-300">
            ShowtimeProp
          </Link>
        )}
        <VideoPanel compact={isModal} theme={theme} />
      </div>
      {authForm}
    </div>
  );

  if (isModal) {
    if (!mounted) return null;
    return createPortal(
      <div className={`fixed inset-0 flex items-center justify-center px-3 py-4 backdrop-blur-sm sm:px-5 ${isLight ? 'bg-zinc-950/35' : 'bg-black/72'}`} style={{ zIndex: 2147483647, isolation: 'isolate' }}>
        <div className={`w-full max-w-5xl overflow-hidden rounded-[2rem] border shadow-2xl ${shellClass} ${isLight ? 'border-zinc-200' : 'border-white/10'}`}>
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-3 sm:p-4">
            <div className="mb-3 lg:hidden">
              <VideoPanel compact theme={theme} />
            </div>
            {content}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return <main className={`min-h-screen px-4 py-8 ${shellClass}`}>{content}</main>;
}
