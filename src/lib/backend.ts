/**
 * Utilidades para los fetch server-side de landings al backend.
 *
 * Todo el SSR de landings sale del mismo contenedor. Sin la clave, el backend
 * le aplicaría el rate limit por IP como a un visitante más, y un crawler
 * recorriendo fichas agotaría el cupo: la página terminaba en 404.
 *
 * Sólo para código de servidor: LANDINGS_SSR_KEY no lleva NEXT_PUBLIC_, así
 * que en el navegador vale undefined y nunca se expone.
 */

export function backendSsrHeaders(): Record<string, string> {
  const key = process.env.LANDINGS_SSR_KEY?.trim();
  return key ? { 'X-Landings-SSR-Key': key } : {};
}

/**
 * El backend no pudo responder (rate limit, 5xx). No es lo mismo que "no
 * existe": si la página respondiera 404, Google la daría de baja. Lanzarlo
 * hace que Next responda 500 y el crawler reintente más tarde.
 */
export class BackendUnavailableError extends Error {
  constructor(readonly status: number, readonly url: string) {
    super(`Backend no disponible (${status}) en ${url}`);
    this.name = 'BackendUnavailableError';
  }
}

/** 429 y 5xx son fallas pasajeras; cualquier otro !ok cuenta como "no existe". */
export function isBackendUnavailable(status: number): boolean {
  return status === 429 || status >= 500;
}
