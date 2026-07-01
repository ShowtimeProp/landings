'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

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

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError('El enlace no es valido o esta incompleto.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/portal/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || 'No pudimos actualizar la contrasena.');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar la contrasena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Panel de busqueda</p>
        <h1 className="mt-2 text-2xl font-semibold">Crear nueva contrasena</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Defini una nueva contrasena para volver a ingresar a tu panel.</p>

        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        {success ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Contrasena actualizada correctamente.
            </div>
            <Link href="/perfil-lead/login" className="inline-flex h-12 w-full items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950">
              Ingresar
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm">
              Nueva contrasena
              <div className="relative mt-1">
                <input required type={showPassword ? 'text' : 'password'} minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 pr-12 text-sm outline-none transition focus:border-cyan-300" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-label={showPassword ? 'Ocultar contrasena' : 'Ver contrasena'}>
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </label>
            <label className="block text-sm">
              Confirmar contrasena
              <div className="relative mt-1">
                <input required type={showConfirmPassword ? 'text' : 'password'} minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 pr-12 text-sm outline-none transition focus:border-cyan-300" />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-label={showConfirmPassword ? 'Ocultar contrasena' : 'Ver contrasena'}>
                  <EyeIcon off={showConfirmPassword} />
                </button>
              </div>
            </label>
            <button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:opacity-60">
              {loading ? 'Guardando...' : 'Actualizar contrasena'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function LeadPortalResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
