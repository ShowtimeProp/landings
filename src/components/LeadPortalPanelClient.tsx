'use client';

import { useEffect, useMemo, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const TOKEN_KEY = 'lead_portal_token';
const ACCOUNT_KEY = 'lead_portal_account';
const SESSION_EXPIRED_MESSAGE = 'Tu sesión ha expirado por seguridad, ingresá nuevamente.';

type Favorite = {
  id: string;
  tenant_id: string;
  lead_id?: string | null;
  property_id?: string | null;
  public_property_id?: string | null;
  listing_snapshot?: Record<string, unknown>;
  source_landing_token?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type Appointment = {
  id: string;
  tenant_id?: string | null;
  property_name?: string | null;
  property_code?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  meeting_type?: string | null;
  status?: string | null;
  category?: string | null;
  is_expired?: boolean;
  google_meet_link?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
};

type TenantLink = {
  tenant_id: string;
  lead_id?: string | null;
  is_buyer: boolean;
};

type MergeCandidate = {
  id: string;
  tenant_id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  created_at?: string | null;
};

type HomePayload = {
  account: {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    phone?: string | null;
    birth_date?: string | null;
    operation_type?: string | null;
  };
  tenant_links: TenantLink[];
  favorites: Favorite[];
  appointments: {
    upcoming: Appointment[];
    cancelled: Appointment[];
    past: Appointment[];
    counts?: Record<string, number>;
  };
  search_profiles: SearchProfile[];
  documentation: {
    status: string;
    message: string;
  };
};

type MatchHistoryItem = {
  landing_token: string;
  landing_url: string;
  properties_count: number;
  click_count: number;
  sent_at?: string | null;
  viewed_at?: string | null;
  updated_at?: string | null;
};

type SearchProfile = {
  id: string;
  tenant_id: string;
  summary?: string | null;
  operation_type?: string | null;
  property_type?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  bedrooms_min?: number | null;
  bathrooms_min?: number | null;
  locations?: string[];
  allow_cross_tenant?: boolean;
  desired_matches_per_batch?: number | null;
  notification_interval_hours?: number | null;
  is_active?: boolean;
  created_at?: string | null;
  history?: MatchHistoryItem[];
};

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(ACCOUNT_KEY);
        window.dispatchEvent(new Event('lead-portal-auth-changed'));
      }
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(payload?.detail || 'No pudimos cargar tu panel.');
  }
  return payload as T;
}

function fmtDate(value?: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(value?: string | null): string {
  return value ? value.slice(0, 5) : '--:--';
}

function appointmentLabel(item: Appointment): string {
  if (item.status === 'cancelled' || item.category === 'cancelled') return 'Cancelada';
  if (item.completed_at || item.status === 'completed') return 'Completada';
  if (item.is_expired || item.category === 'past') return 'Expirada';
  return item.status === 'confirmed' ? 'Confirmada' : 'Agendada';
}

function operationLabel(value?: string | null): string {
  const map: Record<string, string> = {
    sale: 'Comprar',
    venta: 'Comprar',
    buy: 'Comprar',
    comprar: 'Comprar',
    sell: 'Vender',
    vender: 'Vender',
    rent: 'Alquilar',
    alquilar: 'Alquilar',
    rent_out: 'Dar en alquiler',
    dar_en_alquiler: 'Dar en alquiler',
    rent_short_term: 'Alquiler temporario',
    rent_long_term: 'Alquiler largo plazo',
    both: 'Comprar o alquilar',
    multiple: 'Múltiples operaciones',
    multiples_operaciones: 'Múltiples operaciones',
  };
  return value ? map[value] || value : 'Sin operación';
}

function splitFullName(value?: string | null): { first_name: string; last_name: string } {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
}

function propertyTypeLabel(value?: string | null): string {
  const map: Record<string, string> = {
    apartment: 'Departamento',
    house: 'Casa',
    ph: 'PH',
    land: 'Terreno',
    local: 'Local',
    commercial: 'Comercial',
    office: 'Oficina',
    garage: 'Cochera',
    project: 'Proyecto',
    other: 'Otro',
  };
  return value ? map[value] || value : 'Tipo abierto';
}

function fmtDateTime(value?: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function favoriteTitle(favorite: Favorite): string {
  const snapshot = favorite.listing_snapshot || {};
  return String(snapshot.name || snapshot.property_code || favorite.public_property_id || 'Propiedad guardada');
}

function firstImage(favorite: Favorite): string {
  const images = favorite.listing_snapshot?.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) {
      return String((first as { url?: unknown }).url || '');
    }
  }
  return '';
}

function favoriteHref(favorite: Favorite): string {
  const snapshot = favorite.listing_snapshot || {};
  const slug = String(snapshot.slug || '').trim();
  const token = String(favorite.source_landing_token || '');
  const parts = token.startsWith('public:') ? token.split(':') : [];
  const tenantSlug = parts.length >= 3 ? parts[1] : '';
  if (tenantSlug && slug) return `/p/${tenantSlug}/${slug}`;
  if (tenantSlug && favorite.property_id) return `/p/${tenantSlug}/${favorite.property_id}`;
  return '#';
}

function tomorrowISO(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function parseFavoriteFeedback(notes?: string | null): { visited: boolean; comment: string } {
  const text = String(notes || '').trim();
  if (!text) return { visited: false, comment: '' };
  const visited = /Visitada:\s*Si|Visitada:\s*Sí/i.test(text);
  const match = text.match(/Comentario:\s*([\s\S]*)$/i);
  return { visited, comment: (match?.[1] || text).trim() };
}

function buildFavoriteFeedbackNotes(visited: boolean, comment: string): string {
  const cleanComment = String(comment || '').trim();
  if (!visited && !cleanComment) return '';
  return `Visitada: ${visited ? 'Sí' : 'No'}${cleanComment ? `\nComentario: ${cleanComment}` : ''}`;
}

export default function LeadPortalPanelClient() {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [panelTheme, setPanelTheme] = useState<'dark' | 'light'>('dark');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProfileEdit, setSavingProfileEdit] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileEdit, setProfileEdit] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    operation_type: '',
  });
  const [visitFavoriteId, setVisitFavoriteId] = useState<string | null>(null);
  const [feedbackFavoriteId, setFeedbackFavoriteId] = useState<string | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [editingSearchProfileId, setEditingSearchProfileId] = useState<string | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState({
    visited: false,
    comment: '',
  });
  const [visitForm, setVisitForm] = useState({
    scheduled_date: tomorrowISO(),
    scheduled_time: '15:00',
    meeting_type: 'in_person',
    notes: '',
  });
  const [profileForm, setProfileForm] = useState({
    operation_type: 'sale',
    property_type: 'apartment',
    price_min: '',
    price_max: '',
    bedrooms_min: '',
    bathrooms_min: '',
    locations: '',
    desired_matches_per_batch: '10',
    notification_interval_hours: '24',
    summary: '',
  });
  const primaryTenantId = useMemo(() => {
    return home?.tenant_links?.[0]?.tenant_id || home?.favorites?.[0]?.tenant_id || home?.appointments?.upcoming?.[0]?.['tenant_id'] || '';
  }, [home]);
  const isLight = panelTheme === 'light';

  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get('theme');
    setPanelTheme(theme === 'light' ? 'light' : 'dark');
  }, []);

  const load = async () => {
    const token = getToken();
    if (!token) {
      window.location.href = '/perfil-lead/login';
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HomePayload>('/api/portal/buyer/home');
      setHome(data);
      const splitName = splitFullName(data.account.full_name);
      setProfileEdit({
        first_name: data.account.first_name || splitName.first_name,
        last_name: data.account.last_name || splitName.last_name,
        email: data.account.email || '',
        phone: data.account.phone || '',
        birth_date: data.account.birth_date || '',
        operation_type: data.account.operation_type || '',
      });
      const candidates = await apiFetch<{ candidates: MergeCandidate[] }>('/api/portal/buyer/merge-candidates');
      setMergeCandidates(candidates.candidates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar tu panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ACCOUNT_KEY);
    window.location.href = '/';
  };

  const acceptMerge = async (candidateId: string) => {
    setError(null);
    try {
      await apiFetch(`/api/portal/buyer/merge-candidates/${encodeURIComponent(candidateId)}/accept`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos fusionar el contacto.');
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfileEdit(true);
    setError(null);
    try {
      await apiFetch('/api/portal/me', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: profileEdit.first_name || '',
          last_name: profileEdit.last_name || '',
          full_name: [profileEdit.first_name, profileEdit.last_name].map((item) => item.trim()).filter(Boolean).join(' ') || undefined,
          email: profileEdit.email || undefined,
          phone: profileEdit.phone || undefined,
          birth_date: profileEdit.birth_date || '',
          operation_type: profileEdit.operation_type || '',
        }),
      });
      setEditingProfile(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar tu perfil.');
    } finally {
      setSavingProfileEdit(false);
    }
  };

  const createVisit = async (favorite: Favorite) => {
    setSavingVisit(true);
    setError(null);
    try {
      await apiFetch(`/api/portal/favorites/${encodeURIComponent(favorite.id)}/appointment`, {
        method: 'POST',
        body: JSON.stringify(visitForm),
      });
      setVisitFavoriteId(null);
      setVisitForm({ scheduled_date: tomorrowISO(), scheduled_time: '15:00', meeting_type: 'in_person', notes: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear la visita.');
    } finally {
      setSavingVisit(false);
    }
  };

  const removeFavorite = async (favorite: Favorite) => {
    if (!window.confirm('¿Quitar esta propiedad de Mis Favoritos?')) return;
    setRemovingFavoriteId(favorite.id);
    setError(null);
    try {
      await apiFetch(`/api/portal/favorites/${encodeURIComponent(favorite.id)}`, {
        method: 'DELETE',
      });
      if (visitFavoriteId === favorite.id) setVisitFavoriteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos quitar el favorito.');
    } finally {
      setRemovingFavoriteId(null);
    }
  };

  const openFavoriteFeedback = (favorite: Favorite) => {
    const parsed = parseFavoriteFeedback(favorite.notes);
    setFavoriteFeedback(parsed);
    setFeedbackFavoriteId(feedbackFavoriteId === favorite.id ? null : favorite.id);
  };

  const saveFavoriteFeedback = async (favorite: Favorite) => {
    setSavingFeedback(true);
    setError(null);
    try {
      await apiFetch(`/api/portal/favorites/${encodeURIComponent(favorite.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: buildFavoriteFeedbackNotes(favoriteFeedback.visited, favoriteFeedback.comment),
        }),
      });
      setFeedbackFavoriteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar el comentario.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const resetSearchProfileForm = () => {
    setEditingSearchProfileId(null);
    setProfileForm({
      operation_type: 'sale',
      property_type: 'apartment',
      price_min: '',
      price_max: '',
      bedrooms_min: '',
      bathrooms_min: '',
      locations: '',
      desired_matches_per_batch: '10',
      notification_interval_hours: '24',
      summary: '',
    });
  };

  const editSearchProfile = (profile: SearchProfile) => {
    setEditingSearchProfileId(profile.id);
    setProfileForm({
      operation_type: profile.operation_type || 'sale',
      property_type: profile.property_type || 'apartment',
      price_min: profile.price_min != null ? String(profile.price_min) : '',
      price_max: profile.price_max != null ? String(profile.price_max) : '',
      bedrooms_min: profile.bedrooms_min != null ? String(profile.bedrooms_min) : '',
      bathrooms_min: profile.bathrooms_min != null ? String(profile.bathrooms_min) : '',
      locations: (profile.locations || []).join(', '),
      desired_matches_per_batch: profile.desired_matches_per_batch != null ? String(profile.desired_matches_per_batch) : '10',
      notification_interval_hours: profile.notification_interval_hours != null ? String(profile.notification_interval_hours) : '24',
      summary: profile.summary || '',
    });
  };

  const deleteSearchProfile = async (profile: SearchProfile) => {
    if (!window.confirm('¿Desactivar esta alerta de búsqueda?')) return;
    setDeletingProfileId(profile.id);
    setError(null);
    try {
      await apiFetch(`/api/portal/buyer/search-profiles/${encodeURIComponent(profile.id)}`, {
        method: 'DELETE',
      });
      if (editingSearchProfileId === profile.id) resetSearchProfileForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos desactivar la alerta.');
    } finally {
      setDeletingProfileId(null);
    }
  };

  const createSearchProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!primaryTenantId) {
      setError('Todavía no hay un tenant vinculado para crear alertas.');
      return;
    }
    setSavingProfile(true);
    setError(null);
    try {
      const path = editingSearchProfileId
        ? `/api/portal/buyer/search-profiles/${encodeURIComponent(editingSearchProfileId)}`
        : '/api/portal/buyer/search-profiles';
      await apiFetch(path, {
        method: editingSearchProfileId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...(editingSearchProfileId ? {} : { tenant_id: primaryTenantId }),
          preference_mode: 'notify',
          operation_type: profileForm.operation_type || undefined,
          property_type: profileForm.property_type || undefined,
          price_min: profileForm.price_min ? Number(profileForm.price_min) : undefined,
          price_max: profileForm.price_max ? Number(profileForm.price_max) : undefined,
          bedrooms_min: profileForm.bedrooms_min ? Number(profileForm.bedrooms_min) : undefined,
          bathrooms_min: profileForm.bathrooms_min ? Number(profileForm.bathrooms_min) : undefined,
          locations: profileForm.locations
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          summary: profileForm.summary || undefined,
          allow_cross_tenant: true,
          desired_matches_per_batch: profileForm.desired_matches_per_batch ? Number(profileForm.desired_matches_per_batch) : 10,
          notification_interval_hours: profileForm.notification_interval_hours ? Number(profileForm.notification_interval_hours) : 24,
          is_active: true,
        }),
      });
      resetSearchProfileForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear la alerta.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <main className={`lead-portal-panel lead-portal-panel--${panelTheme} flex min-h-screen items-center justify-center ${isLight ? 'bg-zinc-50 text-zinc-950' : 'bg-zinc-950 text-zinc-100'}`}>
        <PanelThemeStyles />
        <p className="text-sm text-zinc-300">Cargando tu panel...</p>
      </main>
    );
  }

  return (
    <main className={`lead-portal-panel lead-portal-panel--${panelTheme} min-h-screen px-4 py-6 ${isLight ? 'bg-zinc-50 text-zinc-950' : 'bg-zinc-950 text-zinc-100'}`}>
      <PanelThemeStyles />
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="panel-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <div>
            <h1 className="mt-1 text-2xl font-semibold">Hola {home?.account.full_name || home?.account.email}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={logout} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/10">
              Salir
            </button>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        {mergeCandidates.length > 0 && (
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Encontramos consultas anteriores</h2>
                <p className="mt-1 text-sm text-amber-50/80">
                  Si reconocés alguno de estos contactos, podés fusionarlo con tu panel. Conservaremos el REF del primer contacto histórico.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {mergeCandidates.map((candidate) => (
                <article key={candidate.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <p className="font-semibold">{candidate.full_name || candidate.email || candidate.phone || 'Consulta previa'}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {candidate.phone || candidate.email || 'Sin contacto visible'} · {candidate.source || 'origen sin dato'}
                  </p>
                  <button
                    onClick={() => acceptMerge(candidate.id)}
                    className="mt-3 rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-200"
                  >
                    Fusionar con mi panel
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <GuideCard icon={<HeartIcon />} title="Favoritos" text="Usá el corazón de cualquier propiedad para armar tu lista corta y comparar mejor." />
          <GuideCard icon={<CalendarIcon />} title="Visitas" text="Acá ves si tus visitas están activas, canceladas o vencidas, y los links virtuales cuando existan." />
          <GuideCard icon={<SirenIcon />} title="Alertas" text="Definí tu criterio de búsqueda para que el sistema te acerque mejores matches." />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <PanelCard title={`Mis Favoritos (${home?.favorites.length || 0})`} icon={<HeartIcon />}>
            {!home?.favorites.length ? (
              <EmptyText>Guardá propiedades desde el corazón de cada card.</EmptyText>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {home.favorites.map((favorite) => {
                  const image = firstImage(favorite);
                  const href = favoriteHref(favorite);
                  const isVisitOpen = visitFavoriteId === favorite.id;
                  const isFeedbackOpen = feedbackFavoriteId === favorite.id;
                  const parsedFeedback = parseFavoriteFeedback(favorite.notes);
                  return (
                    <article key={favorite.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <div className="relative">
                      <a href={href} target="_blank" rel="noreferrer" className={href === '#' ? 'pointer-events-none' : 'block'}>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={favoriteTitle(favorite)} className="h-36 w-full object-cover transition hover:opacity-90" />
                        ) : (
                          <div className="flex h-36 items-center justify-center bg-zinc-900 text-sm text-zinc-500">Sin imagen</div>
                        )}
                      </a>
                        <button
                          type="button"
                          onClick={() => void removeFavorite(favorite)}
                          disabled={removingFavoriteId === favorite.id}
                          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-zinc-100 shadow-lg backdrop-blur transition hover:bg-red-500 hover:text-white disabled:opacity-60"
                          aria-label="Quitar de favoritos"
                          title="Quitar de favoritos"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 font-semibold">{favoriteTitle(favorite)}</h3>
                        {favorite.notes && (
                          <p className="mt-2 whitespace-pre-line rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-zinc-400">
                            {favorite.notes}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {href !== '#' && (
                            <a href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10">
                              Ver propiedad
                            </a>
                          )}
                          {favorite.property_id && (
                            <button
                              type="button"
                              onClick={() => setVisitFavoriteId(isVisitOpen ? null : favorite.id)}
                              className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
                            >
                              Agendar Visita
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openFavoriteFeedback(favorite)}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                          >
                            {parsedFeedback.visited ? 'Editar visita' : 'Marcar visitada'}
                          </button>
                        </div>
                        {isVisitOpen && (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void createVisit(favorite);
                            }}
                            className="mt-3 space-y-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3"
                          >
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                type="date"
                                required
                                value={visitForm.scheduled_date}
                                onChange={(event) => setVisitForm((prev) => ({ ...prev, scheduled_date: event.target.value }))}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-cyan-300"
                              />
                              <input
                                type="time"
                                required
                                value={visitForm.scheduled_time}
                                onChange={(event) => setVisitForm((prev) => ({ ...prev, scheduled_time: event.target.value }))}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-cyan-300"
                              />
                            </div>
                            <select
                              value={visitForm.meeting_type}
                              onChange={(event) => setVisitForm((prev) => ({ ...prev, meeting_type: event.target.value }))}
                              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-cyan-300"
                            >
                              <option value="in_person">Presencial</option>
                              <option value="virtual">Virtual</option>
                              <option value="phone">Llamada</option>
                            </select>
                            <textarea
                              value={visitForm.notes}
                              onChange={(event) => setVisitForm((prev) => ({ ...prev, notes: event.target.value }))}
                              placeholder="Comentario opcional"
                              className="min-h-16 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-cyan-300"
                            />
                            <button disabled={savingVisit} className="w-full rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-60">
                              {savingVisit ? 'Creando...' : 'Confirmar visita'}
                            </button>
                          </form>
                        )}
                        {isFeedbackOpen && (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveFavoriteFeedback(favorite);
                            }}
                            className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                          >
                            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                              <input
                                type="checkbox"
                                checked={favoriteFeedback.visited}
                                onChange={(event) => setFavoriteFeedback((prev) => ({ ...prev, visited: event.target.checked }))}
                                className="h-4 w-4 rounded border-white/20 bg-black/30 accent-cyan-300"
                              />
                              Ya visité esta propiedad
                            </label>
                            <textarea
                              value={favoriteFeedback.comment}
                              onChange={(event) => setFavoriteFeedback((prev) => ({ ...prev, comment: event.target.value }))}
                              placeholder="Qué te gustó, qué no, dudas para revisar..."
                              className="min-h-20 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-cyan-300"
                            />
                            <button disabled={savingFeedback} className="w-full rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-60">
                              {savingFeedback ? 'Guardando...' : 'Guardar comentario'}
                            </button>
                          </form>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Perfil y documentación">
            <div className="space-y-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-zinc-100">Datos básicos</p>
                <button
                  type="button"
                  onClick={() => setEditingProfile((value) => !value)}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
                >
                  {editingProfile ? 'Cancelar' : 'Editar'}
                </button>
              </div>
              {editingProfile ? (
                <form onSubmit={saveProfile} className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={profileEdit.first_name}
                      onChange={(event) => setProfileEdit((prev) => ({ ...prev, first_name: event.target.value }))}
                      placeholder="Nombre"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                    />
                    <input
                      value={profileEdit.last_name}
                      onChange={(event) => setProfileEdit((prev) => ({ ...prev, last_name: event.target.value }))}
                      placeholder="Apellido"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                    />
                  </div>
                  <input
                    type="email"
                    value={profileEdit.email}
                    onChange={(event) => setProfileEdit((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  />
                  <input
                    value={profileEdit.phone}
                    onChange={(event) => setProfileEdit((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Teléfono"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  />
                  <label className="block space-y-1 text-xs font-semibold text-zinc-300">
                    Fecha de nacimiento
                    <input
                      type="date"
                      value={profileEdit.birth_date}
                      onChange={(event) => setProfileEdit((prev) => ({ ...prev, birth_date: event.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-normal outline-none focus:border-cyan-300"
                    />
                  </label>
                  <select
                    value={profileEdit.operation_type}
                    onChange={(event) => setProfileEdit((prev) => ({ ...prev, operation_type: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="">Tipo de operación</option>
                    <option value="buy">Comprar</option>
                    <option value="sell">Vender</option>
                    <option value="rent">Alquilar</option>
                    <option value="rent_out">Dar en Alquiler</option>
                    <option value="multiple">Múltiples Operaciones</option>
                  </select>
                  <button disabled={savingProfileEdit} className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60">
                    {savingProfileEdit ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </form>
              ) : (
                <>
                  <p>Nombre: {home?.account.first_name || splitFullName(home?.account.full_name).first_name || 'Pendiente'}</p>
                  <p>Apellido: {home?.account.last_name || splitFullName(home?.account.full_name).last_name || 'Pendiente'}</p>
                  <p>Email: {home?.account.email}</p>
                  <p>Teléfono: {home?.account.phone || 'Pendiente'}</p>
                  <p>Fecha de nacimiento: {home?.account.birth_date || 'Pendiente'}</p>
                  <p>Tipo de operación: {operationLabel(home?.account.operation_type)}</p>
                </>
              )}
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="font-semibold text-zinc-100">Documentación</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  {home?.documentation.message || 'Próximamente vas a poder preparar documentación desde acá.'}
                </p>
              </div>
            </div>
          </PanelCard>
        </section>

        <PanelCard title="Agenda de Visitas" icon={<CalendarIcon />}>
          <AppointmentGroup title="Activas" items={home?.appointments.upcoming || []} />
          <AppointmentGroup title="Canceladas" items={home?.appointments.cancelled || []} muted />
          <AppointmentGroup title="Vencidas o expiradas" items={home?.appointments.past || []} muted />
        </PanelCard>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <PanelCard title={editingSearchProfileId ? 'Editar Alerta de Búsqueda' : 'Crear Alerta de Búsqueda'}>
            <form onSubmit={createSearchProfile} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-zinc-300">
                  Tipo de operación
                  <select
                    value={profileForm.operation_type}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, operation_type: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-normal outline-none focus:border-cyan-300"
                  >
                    <option value="sale">Comprar</option>
                    <option value="rent_long_term">Alquiler tradicional</option>
                    <option value="rent_short_term">Alquiler vacacional</option>
                    <option value="both">Múltiples operaciones</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-zinc-300">
                  Tipo de propiedad
                  <select
                    value={profileForm.property_type}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, property_type: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-normal outline-none focus:border-cyan-300"
                  >
                    <option value="apartment">Departamento</option>
                    <option value="house">Casa</option>
                    <option value="ph">PH</option>
                    <option value="land">Terreno</option>
                    <option value="local">Local</option>
                    <option value="office">Oficina</option>
                    <option value="garage">Cochera</option>
                    <option value="project">Proyecto</option>
                    <option value="other">Otro</option>
                  </select>
                </label>
              </div>
              <label className="space-y-1 text-xs font-semibold text-zinc-300">
                Ubicaciones
                <input
                  value={profileForm.locations}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, locations: event.target.value }))}
                  placeholder="Mar del Plata, Güemes, Centro"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-normal outline-none focus:border-cyan-300"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={profileForm.price_min}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, price_min: event.target.value }))}
                  placeholder="Precio mínimo"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
                <input
                  value={profileForm.price_max}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, price_max: event.target.value }))}
                  placeholder="Precio máximo"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={profileForm.bedrooms_min}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, bedrooms_min: event.target.value }))}
                  placeholder="Dormitorios mínimos"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
                <input
                  value={profileForm.bathrooms_min}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, bathrooms_min: event.target.value }))}
                  placeholder="Baños mínimos"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={profileForm.desired_matches_per_batch}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, desired_matches_per_batch: event.target.value }))}
                  placeholder="Matches por envío"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
                <input
                  value={profileForm.notification_interval_hours}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, notification_interval_hours: event.target.value }))}
                  placeholder="Intervalo aviso (hs)"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
              </div>
              <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs leading-5 text-cyan-50/80">
                Cross-tenant se activa automáticamente cuando la inmobiliaria lo permite.
              </p>
              <textarea
                value={profileForm.summary}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Comentarios: qué te gustaría encontrar"
                className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
              />
              <button
                disabled={savingProfile}
                className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                {savingProfile ? 'Guardando...' : editingSearchProfileId ? 'Guardar alerta' : 'Activar alerta'}
              </button>
              {editingSearchProfileId && (
                <button
                  type="button"
                  onClick={resetSearchProfileForm}
                  className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/10"
                >
                  Cancelar edición
                </button>
              )}
            </form>
          </PanelCard>

          <PanelCard title={`Alertas Activas (${home?.search_profiles.filter((profile) => profile.is_active !== false).length || 0})`} icon={<SirenIcon />}>
            {!home?.search_profiles.filter((profile) => profile.is_active !== false).length ? (
              <EmptyText>Todavía no cargaste criterios. Creá una alerta para recibir mejores opciones.</EmptyText>
            ) : (
              <div className="space-y-3">
                {home.search_profiles.filter((profile) => profile.is_active !== false).map((profile) => (
                  <article key={profile.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{operationLabel(profile.operation_type)}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {(profile.locations || []).join(', ') || 'Sin zonas'} · {propertyTypeLabel(profile.property_type)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editSearchProfile(profile)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-200 hover:bg-white/10"
                          aria-label="Editar alerta"
                          title="Editar alerta"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSearchProfile(profile)}
                          disabled={deletingProfileId === profile.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-200 hover:bg-red-500 hover:text-white disabled:opacity-60"
                          aria-label="Borrar alerta"
                          title="Borrar alerta"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Precio {profile.price_min || '-'} / {profile.price_max || '-'} · D {profile.bedrooms_min || '-'} · B {profile.bathrooms_min || '-'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {profile.desired_matches_per_batch || 10} matches por envío · cada {profile.notification_interval_hours || 24} hs ·{' '}
                      {profile.allow_cross_tenant ? 'Cross-tenant' : 'Solo inmobiliaria'}
                    </p>
                    {profile.summary && <p className="mt-2 text-sm text-zinc-300">{profile.summary}</p>}
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Historial de links</p>
                      {!profile.history?.length ? (
                        <p className="mt-2 text-xs text-zinc-500">Todavía no hay links enviados para esta alerta.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {profile.history.slice(0, 4).map((item) => (
                            <a
                              key={item.landing_token}
                              href={item.landing_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
                            >
                              <span>{fmtDateTime(item.sent_at || item.updated_at)}</span>
                              <span className="text-cyan-200">{item.properties_count} propiedades</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PanelCard>
        </section>
      </div>
    </main>
  );
}

function PanelThemeStyles() {
  return (
    <style jsx global>{`
      .lead-portal-panel select option {
        background: #09090b;
        color: #f4f4f5;
      }

      .lead-portal-panel select:focus,
      .lead-portal-panel input:focus,
      .lead-portal-panel textarea:focus {
        outline: none;
        border-color: #22d3ee;
        box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.22);
      }

      .lead-portal-panel--light {
        background: #f8fafc;
        color: #18181b;
      }

      .lead-portal-panel--light .panel-card {
        background: #ffffff;
        border-color: #e4e4e7;
        color: #18181b;
      }

      .lead-portal-panel--light .guide-card {
        background: #ecfeff;
        border-color: rgba(8, 145, 178, 0.24);
        color: #164e63;
      }

      .lead-portal-panel--light .panel-empty {
        background: #f8fafc;
        border-color: #e4e4e7;
        color: #71717a;
      }

      .lead-portal-panel--light input,
      .lead-portal-panel--light select,
      .lead-portal-panel--light textarea {
        background: #ffffff !important;
        border-color: #d4d4d8 !important;
        color: #18181b !important;
      }

      .lead-portal-panel--light select option {
        background: #ffffff;
        color: #18181b;
      }

      .lead-portal-panel--light input::placeholder,
      .lead-portal-panel--light textarea::placeholder {
        color: #71717a;
      }

      .lead-portal-panel--light .text-zinc-100,
      .lead-portal-panel--light .text-zinc-200,
      .lead-portal-panel--light .text-zinc-300 {
        color: #27272a;
      }

      .lead-portal-panel--light .text-zinc-400,
      .lead-portal-panel--light .text-zinc-500 {
        color: #71717a;
      }

      .lead-portal-panel--light .bg-black\\/20,
      .lead-portal-panel--light .bg-black\\/25,
      .lead-portal-panel--light .bg-black\\/30 {
        background: #ffffff;
      }
    `}</style>
  );
}

function PanelCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel-card rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon && <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">{icon}</span>}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6c-1.8-1.8-4.7-1.8-6.5 0L12 6.9 9.7 4.6c-1.8-1.8-4.7-1.8-6.5 0s-1.8 4.7 0 6.5L12 20l8.8-8.9c1.8-1.8 1.8-4.7 0-6.5Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </svg>
  );
}

function SirenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 18v-6a5 5 0 0 1 10 0v6" />
      <path d="M5 18h14M4 22h16M12 2v3M4.2 5.2l2.1 2.1M19.8 5.2l-2.1 2.1" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
    </svg>
  );
}

function GuideCard({ title, text, icon }: { title: string; text: string; icon?: React.ReactNode }) {
  return (
    <article className="guide-card rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
        {icon && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-200/20 bg-black/20">{icon}</span>}
        {title}
      </h2>
      <p className="mt-2 text-xs leading-5 text-cyan-50/80">{text}</p>
    </article>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="panel-empty rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">{children}</p>;
}

function AppointmentGroup({ title, items, muted = false }: { title: string; items: Appointment[]; muted?: boolean }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className={`text-sm font-semibold ${muted ? 'text-zinc-400' : 'text-cyan-200'}`}>{title}</h3>
      {!items.length ? (
        <p className="mt-2 text-sm text-zinc-500">Sin citas en esta categoría.</p>
      ) : (
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {fmtDate(item.scheduled_date)} · {fmtTime(item.scheduled_time)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {item.property_name || item.property_code || 'Propiedad'} · {item.meeting_type === 'virtual' ? 'Virtual' : 'Presencial'}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-300">
                  {appointmentLabel(item)}
                </span>
              </div>
              {item.google_meet_link && (
                <a
                  href={item.google_meet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-300"
                >
                  Abrir videollamada
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
