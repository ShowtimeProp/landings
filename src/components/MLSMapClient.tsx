'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type MapPoint = {
  id: string;
  title: string | null;
  zona: string | null;
  localidad: string | null;
  property_type: string | null;
  tipo_operacion: string | null;
  price: number | null;
  price_currency: string | null;
  ambientes: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  latitude: number;
  longitude: number;
  image_url: string | null;
  days_on_market?: number | null;
  price_per_m2?: number | null;
  construction_year?: number | null;
  age_years?: number | null;
  expenses_amount?: number | null;
  expenses_currency?: string | null;
  expenses_period?: string | null;
  feature_flags?: Record<string, boolean> | null;
};

type ListingDetail = MapPoint & {
  description: string | null;
  address: string | null;
  images_array: string[] | null;
  inmobiliaria: string | null;
  inmobiliaria_phone: string | null;
  inmobiliaria_whatsapp: string | null;
  detail_url: string | null;
  source_listing_url?: string | null;
  tour_virtual: string | null;
};

type SearchResult = MapPoint & {
  score?: number | null;
  description?: string | null;
  ranking_reason?: string | null;
};

type Locality = {
  slug: string;
  label: string;
  count: number;
  aliases: string[];
  center: { lat: number; lng: number };
  bounds: { south: number; west: number; north: number; east: number };
};

type MapTheme = 'dark' | 'light' | 'soft';

const MAP_THEMES: { value: MapTheme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'soft', label: 'Soft' },
];

const OPERATIONS = [
  { value: '', label: 'Operacion' },
  { value: 'VENTA', label: 'Venta' },
  { value: 'ALQUILER', label: 'Alquiler' },
  { value: 'ALQUILER_TEMPORARIO', label: 'Alq. temporario' },
];

const TYPES = [
  { value: '', label: 'Tipo' },
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'ph', label: 'PH' },
  { value: 'land', label: 'Terreno' },
  { value: 'local', label: 'Local' },
  { value: 'garage', label: 'Cochera' },
];

function mapStyleForTheme(theme: MapTheme, styleUrl?: string | null): string {
  if (theme === 'light') return 'mapbox://styles/mapbox/light-v11';
  if (theme === 'soft') return styleUrl || 'mapbox://styles/mapbox/streets-v12';
  return 'mapbox://styles/mapbox/dark-v11';
}

function readStoredTheme(): MapTheme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('mls-map-theme');
  return stored === 'light' || stored === 'soft' || stored === 'dark' ? stored : 'dark';
}

function readUrlParam(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) || '';
}

function formatPrice(price: number | null | undefined, currency: string | null | undefined): string {
  if (!price) return 'Consultar';
  const cur = currency === 'USD' || currency === 'U$S' ? 'U$S' : '$';
  return `${cur} ${Math.round(price).toLocaleString('es-AR')}`;
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined): string | null {
  if (!value) return null;
  const cur = currency === 'USD' || currency === 'U$S' ? 'U$S' : '$';
  return `${cur} ${Math.round(value).toLocaleString('es-AR')}`;
}

function formatType(value: string | null | undefined): string {
  const map: Record<string, string> = {
    apartment: 'Departamento',
    departamento: 'Departamento',
    house: 'Casa',
    casa: 'Casa',
    ph: 'PH',
    land: 'Terreno',
    terreno: 'Terreno',
    lote: 'Terreno',
    local: 'Local',
    garage: 'Cochera',
    cochera: 'Cochera',
    project: 'Proyecto',
    proyecto: 'Proyecto',
  };
  return map[value || ''] || value || 'Propiedad';
}

function formatOperation(value: string | null | undefined): string {
  const map: Record<string, string> = {
    VENTA: 'Venta',
    ALQUILER: 'Alquiler',
    ALQUILER_TEMPORARIO: 'Alquiler temporario',
  };
  return map[value || ''] || value || '';
}

function normalizeWhatsApp(value: string | null | undefined): string {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.startsWith('54') ? digits : `54${digits}`;
}

function updateSearchParam(name: string, value: string | null, mode: 'push' | 'replace' = 'replace') {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  const qs = url.searchParams.toString();
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
}

function listingFromFeature(feature: mapboxgl.MapboxGeoJSONFeature): MapPoint | null {
  if (feature.geometry.type !== 'Point') return null;
  const p = feature.properties as Record<string, unknown>;
  const coords = feature.geometry.coordinates as [number, number];
  return {
    id: String(p.id || feature.id || ''),
    title: p.title ? String(p.title) : null,
    zona: p.zona ? String(p.zona) : null,
    localidad: p.localidad ? String(p.localidad) : null,
    property_type: p.property_type ? String(p.property_type) : null,
    tipo_operacion: p.tipo_operacion ? String(p.tipo_operacion) : null,
    price: p.price != null ? Number(p.price) : null,
    price_currency: p.price_currency ? String(p.price_currency) : null,
    ambientes: p.ambientes != null ? Number(p.ambientes) : null,
    bedrooms: p.bedrooms != null ? Number(p.bedrooms) : null,
    bathrooms: p.bathrooms != null ? Number(p.bathrooms) : null,
    area_m2: p.area_m2 != null ? Number(p.area_m2) : null,
    latitude: coords[1],
    longitude: coords[0],
    image_url: p.image_url ? String(p.image_url) : null,
    days_on_market: p.days_on_market != null ? Number(p.days_on_market) : null,
    price_per_m2: p.price_per_m2 != null ? Number(p.price_per_m2) : null,
    construction_year: p.construction_year != null ? Number(p.construction_year) : null,
    age_years: p.age_years != null ? Number(p.age_years) : null,
    expenses_amount: p.expenses_amount != null ? Number(p.expenses_amount) : null,
    expenses_currency: p.expenses_currency ? String(p.expenses_currency) : null,
    expenses_period: p.expenses_period ? String(p.expenses_period) : null,
  };
}

function hasHoverPointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export default function MLSMapClient({
  backendUrl,
  mapboxToken,
  center,
  zoom,
  styleUrl,
  defaultLocalitySlug = 'mar-del-plata',
  enable3d = true,
}: {
  backendUrl: string;
  mapboxToken: string;
  center: { lat: number; lng: number };
  zoom: number;
  styleUrl?: string | null;
  defaultLocalitySlug?: string;
  enable3d?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const fetchTimer = useRef<number | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const didApplyInitialTheme = useRef(false);
  const supportsHoverRef = useRef(false);
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const highlightedIdsRef = useRef<string[]>([]);
  const hoverHideTimer = useRef<number | null>(null);
  const hoverCardLocked = useRef(false);

  const [operation, setOperation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [localitySlug, setLocalitySlug] = useState(() => readUrlParam('localidad') || defaultLocalitySlug);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [returned, setReturned] = useState<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);
  const [assistantCaveats, setAssistantCaveats] = useState<string[]>([]);
  const [theme, setTheme] = useState<MapTheme>(() => readStoredTheme());
  const [is3d, setIs3d] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<MapPoint | null>(null);
  const [hoverScreenPoint, setHoverScreenPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(() => readUrlParam('listing') || null);
  const [selectedListing, setSelectedListing] = useState<ListingDetail | null>(null);
  const [listingLoading, setListingLoading] = useState(false);

  const filtersRef = useRef({ operation: '', propertyType: '', localitySlug: '' });
  filtersRef.current = { operation, propertyType, localitySlug };

  const selectedLocality = useMemo(
    () => localities.find((item) => item.slug === localitySlug) || null,
    [localities, localitySlug]
  );

  const setFeatureFlag = useCallback((id: string | null, key: string, value: boolean) => {
    const map = mapRef.current;
    if (!map || !id || !map.getSource('listings')) return;
    try {
      map.setFeatureState({ source: 'listings', id }, { [key]: value });
    } catch {
      /* feature may not be loaded in the current viewport */
    }
  }, []);

  const setHoveredFeature = useCallback((id: string | null) => {
    if (hoveredIdRef.current && hoveredIdRef.current !== id) {
      setFeatureFlag(hoveredIdRef.current, 'hovered', false);
    }
    hoveredIdRef.current = id;
    setFeatureFlag(id, 'hovered', Boolean(id));
  }, [setFeatureFlag]);

  const setSelectedFeature = useCallback((id: string | null) => {
    if (selectedIdRef.current && selectedIdRef.current !== id) {
      setFeatureFlag(selectedIdRef.current, 'selected', false);
    }
    selectedIdRef.current = id;
    setFeatureFlag(id, 'selected', Boolean(id));
  }, [setFeatureFlag]);

  const applyHighlightedIds = useCallback((ids: string[]) => {
    for (const id of highlightedIdsRef.current) {
      if (!ids.includes(id)) setFeatureFlag(id, 'highlighted', false);
    }
    highlightedIdsRef.current = ids;
    for (const id of ids) setFeatureFlag(id, 'highlighted', true);
  }, [setFeatureFlag]);

  const setupListingLayers = useCallback((map: mapboxgl.Map) => {
    if (!map.getSource('listings')) {
      map.addSource('listings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 46,
        promoteId: 'id',
      });
    }

    if (!map.getLayer('clusters')) {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'listings',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#38bdf8', 25, '#818cf8', 100, '#f472b6'],
          'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 100, 30],
          'circle-opacity': 0.86,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.72)',
        },
      });
    }

    if (!map.getLayer('cluster-count')) {
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'listings',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#0f172a' },
      });
    }

    if (!map.getLayer('unclustered-halo')) {
      map.addLayer({
        id: 'unclustered-halo',
        type: 'circle',
        source: 'listings',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#f472b6',
            ['boolean', ['feature-state', 'highlighted'], false], '#facc15',
            ['boolean', ['feature-state', 'hovered'], false], '#22d3ee',
            '#22d3ee',
          ],
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 16,
            ['boolean', ['feature-state', 'highlighted'], false], 14,
            ['boolean', ['feature-state', 'hovered'], false], 13,
            10,
          ],
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'hovered'], false], 0.2,
            ['boolean', ['feature-state', 'selected'], false], 0.18,
            ['boolean', ['feature-state', 'highlighted'], false], 0.18,
            0.1,
          ],
        },
      });
    }

    if (!map.getLayer('unclustered')) {
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'listings',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#f472b6',
            ['boolean', ['feature-state', 'highlighted'], false], '#facc15',
            ['==', ['get', 'tipo_operacion'], 'VENTA'], '#2563eb',
            ['==', ['get', 'tipo_operacion'], 'ALQUILER'], '#10b981',
            '#22d3ee',
          ],
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 8.5,
            ['boolean', ['feature-state', 'highlighted'], false], 8,
            ['boolean', ['feature-state', 'hovered'], false], 8,
            6.5,
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.5,
            ['boolean', ['feature-state', 'hovered'], false], 2,
            1.5,
          ],
          'circle-stroke-color': '#ffffff',
        },
      });
    }
  }, []);

  const apply3dMode = useCallback((map: mapboxgl.Map, enabled: boolean) => {
    const existing = map.getLayer('3d-buildings');
    if (!enabled) {
      if (existing) map.removeLayer('3d-buildings');
      map.easeTo({ pitch: 0, bearing: 0, duration: 650 });
      return;
    }

    const targetZoom = Math.max(map.getZoom(), 15.4);
    if (!map.getSource('composite')) {
      map.easeTo({ pitch: 58, bearing: -18, zoom: targetZoom, duration: 650 });
      return;
    }
    if (!existing) {
      const layers = map.getStyle()?.layers || [];
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
      )?.id;
      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#b9c3cf',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.4,
              ['max', ['to-number', ['get', 'height'], 14], 10],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.4,
              ['to-number', ['get', 'min_height'], 0],
            ],
            'fill-extrusion-opacity': 0.5,
          },
        },
        labelLayerId
      );
    }
    map.easeTo({ pitch: 58, bearing: -18, zoom: targetZoom, duration: 650 });
  }, []);

  const fetchPoints = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const { operation: op, propertyType: pt, localitySlug: loc } = filtersRef.current;
    const params = new URLSearchParams({
      min_lat: String(b.getSouth()),
      max_lat: String(b.getNorth()),
      min_lng: String(b.getWest()),
      max_lng: String(b.getEast()),
      zoom: String(map.getZoom()),
      fields: 'card',
    });
    if (op) params.set('operation', op);
    if (pt) params.set('property_type', pt);
    if (loc) params.set('locality_slug', loc);
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    try {
      const res = await fetch(`${backendUrl}/api/mls/public/map?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        total: number;
        returned?: number;
        truncated?: boolean;
        points: MapPoint[];
      };
      setTotal(data.total);
      setReturned(data.returned ?? data.points.length);
      setTruncated(Boolean(data.truncated));
      const source = map.getSource('listings') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: data.points.map((p) => ({
            type: 'Feature',
            id: p.id,
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
            properties: { ...p },
          })),
        });
        window.setTimeout(() => {
          applyHighlightedIds(highlightedIdsRef.current);
          setSelectedFeature(selectedIdRef.current);
        }, 0);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        /* red caida: mantener puntos previos */
      }
    }
  }, [applyHighlightedIds, backendUrl, setSelectedFeature]);

  const scheduleFetch = useCallback(() => {
    if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(fetchPoints, 300);
  }, [fetchPoints]);

  const fitLocality = useCallback((locality: Locality | null) => {
    const map = mapRef.current;
    if (!map || !locality) return;
    map.fitBounds(
      [
        [locality.bounds.west, locality.bounds.south],
        [locality.bounds.east, locality.bounds.north],
      ],
      { padding: { top: 120, right: 90, bottom: 90, left: 430 }, maxZoom: 13 }
    );
  }, []);

  const openListing = useCallback((id: string, pushUrl = true) => {
    setSelectedListingId(id);
    setSelectedFeature(id);
    if (pushUrl) updateSearchParam('listing', id, 'push');
  }, [setSelectedFeature]);

  const closeListing = useCallback((pushUrl = true) => {
    setSelectedListingId(null);
    setSelectedListing(null);
    setSelectedFeature(null);
    if (pushUrl) updateSearchParam('listing', null, 'push');
  }, [setSelectedFeature]);

  const hideHoverSoon = useCallback(() => {
    if (hoverHideTimer.current) window.clearTimeout(hoverHideTimer.current);
    hoverHideTimer.current = window.setTimeout(() => {
      if (hoverCardLocked.current) return;
      setHoveredFeature(null);
      setHoverPoint(null);
      setHoverScreenPoint(null);
    }, 120);
  }, [setHoveredFeature]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${backendUrl}/api/mls/public/localities?min_count=20`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { localities?: Locality[] } | null) => {
        if (cancelled) return;
        setLocalities(data?.localities || []);
      })
      .catch(() => {
        if (!cancelled) setLocalities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

  useEffect(() => {
    supportsHoverRef.current = hasHoverPointer();
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyleForTheme(theme, styleUrl),
      center: [center.lng, center.lat],
      zoom,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');

    map.on('load', () => {
      setupListingLayers(map);
      apply3dMode(map, is3d);

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const src = map.getSource('listings') as mapboxgl.GeoJSONSource;
        if (clusterId == null || !src) return;
        src.getClusterExpansionZoom(clusterId, (err, z) => {
          if (err || z == null) return;
          const geom = features[0].geometry;
          if (geom.type === 'Point') {
            map.easeTo({ center: geom.coordinates as [number, number], zoom: z });
          }
        });
      });

      map.on('click', 'unclustered', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const point = listingFromFeature(f);
        if (!point?.id) return;
        openListing(point.id);
      });

      map.on('mousemove', 'unclustered', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (!supportsHoverRef.current) return;
        const f = e.features?.[0];
        if (!f) return;
        const point = listingFromFeature(f);
        if (!point?.id) return;
        if (hoverHideTimer.current) window.clearTimeout(hoverHideTimer.current);
        setHoveredFeature(point.id);
        setHoverPoint(point);
        setHoverScreenPoint({ x: e.point.x, y: e.point.y });
      });
      map.on('mouseleave', 'unclustered', () => {
        map.getCanvas().style.cursor = '';
        hideHoverSoon();
      });

      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

      map.on('moveend', scheduleFetch);
      fetchPoints();
      map.resize();
    });

    const onResize = () => map.resize();
    const onPopState = () => {
      const listing = readUrlParam('listing');
      if (listing) openListing(listing, false);
      else closeListing(false);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('popstate', onPopState);
    const resizeTimers = [0, 150, 400].map((ms) =>
      window.setTimeout(() => map.resize(), ms)
    );

    return () => {
      fetchAbortRef.current?.abort();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('popstate', onPopState);
      resizeTimers.forEach((id) => window.clearTimeout(id));
      if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    window.localStorage.setItem('mls-map-theme', theme);
    if (!map) return;
    if (!didApplyInitialTheme.current) {
      didApplyInitialTheme.current = true;
      return;
    }

    map.setStyle(mapStyleForTheme(theme, styleUrl));
    map.once('style.load', () => {
      setupListingLayers(map);
      apply3dMode(map, is3d);
      fetchPoints();
    });
  }, [apply3dMode, fetchPoints, is3d, setupListingLayers, styleUrl, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    apply3dMode(map, is3d);
  }, [apply3dMode, is3d]);

  useEffect(() => {
    if (selectedLocality) {
      updateSearchParam('localidad', selectedLocality.slug, 'replace');
      fitLocality(selectedLocality);
    }
    scheduleFetch();
  }, [fitLocality, operation, propertyType, scheduleFetch, selectedLocality]);

  useEffect(() => {
    if (!selectedListingId) return;
    const controller = new AbortController();
    setListingLoading(true);
    setSelectedListing(null);
    fetch(`${backendUrl}/api/mls/public/listings/${encodeURIComponent(selectedListingId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ListingDetail | null) => setSelectedListing(data))
      .catch(() => setSelectedListing(null))
      .finally(() => setListingLoading(false));
    return () => controller.abort();
  }, [backendUrl, selectedListingId]);

  const runAssistantSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 3) return;
    setSearching(true);
    setAssistantAnswer(null);
    setAssistantCaveats([]);
    try {
      const body: Record<string, unknown> = { query: q, max_results: 20 };
      if (operation) body.operation = operation;
      if (propertyType) body.property_type = propertyType;
      if (localitySlug) body.locality_slug = localitySlug;
      const res = await fetch(`${backendUrl}/api/mls/public/assistant/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = (await res.json()) as {
        answer?: string;
        caveats?: string[];
        results: SearchResult[];
      };
      const nextResults = data.results || [];
      setResults(nextResults);
      setAssistantAnswer(data.answer || null);
      setAssistantCaveats(data.caveats || []);
      applyHighlightedIds(nextResults.map((r) => r.id));
      const map = mapRef.current;
      if (map && nextResults.length) {
        const bounds = new mapboxgl.LngLatBounds();
        let any = false;
        for (const r of nextResults) {
          if (r.latitude && r.longitude) {
            bounds.extend([r.longitude, r.latitude]);
            any = true;
          }
        }
        if (any) map.fitBounds(bounds, { padding: 90, maxZoom: 15 });
      }
    } finally {
      setSearching(false);
    }
  }, [applyHighlightedIds, backendUrl, localitySlug, operation, propertyType, query]);

  const flyTo = useCallback((r: SearchResult) => {
    const map = mapRef.current;
    if (!map || !r.latitude || !r.longitude) return;
    map.flyTo({ center: [r.longitude, r.latitude], zoom: 16 });
  }, []);

  const headline = useMemo(() => {
    if (total == null) return 'Cargando propiedades...';
    const count = total.toLocaleString('es-AR');
    const prefix = selectedLocality ? selectedLocality.label : 'esta zona';
    if (truncated && returned != null) {
      return `${returned.toLocaleString('es-AR')} de ${count} propiedades en ${prefix}`;
    }
    return `${count} propiedades en ${prefix}`;
  }, [returned, selectedLocality, total, truncated]);

  const isLight = theme === 'light';
  const isSoft = theme === 'soft';
  const rootClass = isLight ? 'bg-zinc-100' : isSoft ? 'bg-[#f4f0e8]' : 'bg-zinc-950';
  const panelClass = isLight
    ? 'border-zinc-200 bg-white/92 shadow-xl'
    : isSoft
      ? 'border-stone-200/80 bg-[#fbf7ef]/92 shadow-xl'
      : 'border-white/10 bg-zinc-900/90 shadow-xl';
  const titleClass = isLight || isSoft ? 'text-zinc-950' : 'text-white';
  const subtleClass = isLight ? 'text-zinc-500' : isSoft ? 'text-stone-500' : 'text-zinc-400';
  const fieldClass = isLight
    ? 'border-zinc-200 bg-zinc-50 text-zinc-950 placeholder-zinc-400 focus:border-cyan-500'
    : isSoft
      ? 'border-stone-200 bg-white/75 text-stone-950 placeholder-stone-400 focus:border-cyan-500'
      : 'border-white/10 bg-zinc-800 text-white placeholder-zinc-500 focus:border-cyan-500';
  const selectClass = isLight
    ? 'border-zinc-200 bg-zinc-50 text-zinc-900'
    : isSoft
      ? 'border-stone-200 bg-white/75 text-stone-900'
      : 'border-white/10 bg-zinc-800 text-white';
  const themeShellClass = isLight
    ? 'border-zinc-200 bg-zinc-100'
    : isSoft
      ? 'border-stone-200 bg-stone-100/80'
      : 'border-white/15 bg-white/5';
  const inactiveThemeClass = isLight
    ? 'text-zinc-600 hover:text-zinc-950'
    : isSoft
      ? 'text-stone-600 hover:text-stone-950'
      : 'text-zinc-300 hover:text-zinc-100';
  const activeThemeClass = 'bg-white text-zinc-900 shadow-sm';
  const resultsClass = isLight
    ? 'border-zinc-200 bg-white/94 shadow-xl'
    : isSoft
      ? 'border-stone-200/80 bg-[#fbf7ef]/94 shadow-xl'
      : 'border-white/10 bg-zinc-900/90 shadow-xl';
  const resultHoverClass = isLight || isSoft ? 'hover:bg-zinc-950/[0.04]' : 'hover:bg-white/5';
  const resultBorderClass = isLight ? 'border-zinc-100' : isSoft ? 'border-stone-200/70' : 'border-white/5';
  const resultTitleClass = isLight || isSoft ? 'text-zinc-950' : 'text-white';
  const resultBodyClass = isLight ? 'text-zinc-600' : isSoft ? 'text-stone-600' : 'text-zinc-300';
  const resultMutedClass = isLight ? 'text-zinc-500' : isSoft ? 'text-stone-500' : 'text-zinc-500';

  return (
    <main className={`mls-map-root fixed inset-0 z-0 h-[100dvh] w-full overflow-hidden ${rootClass}`}>
      <div ref={containerRef} className="h-full w-full min-h-[100dvh]" />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex flex-col gap-2 p-3 md:left-4 md:right-auto md:top-4 md:w-[430px] md:p-0">
        <div className={`pointer-events-auto rounded-2xl border p-3 backdrop-blur ${panelClass}`}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`mb-0.5 truncate text-base font-bold ${titleClass}`}>
                Propiedades en {selectedLocality?.label || 'Costa Atlantica'}
              </h1>
              <p className={`text-xs ${subtleClass}`}>{headline}</p>
            </div>
            <nav
              aria-label="Estilo del mapa"
              className={`flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${themeShellClass}`}
            >
              {MAP_THEMES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className={`rounded-full px-2 py-1 transition ${theme === item.value ? activeThemeClass : inactiveThemeClass}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAssistantSearch()}
              placeholder='Pedi algo: "departamentos nuevos con mejor precio por m2"'
              className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none ${fieldClass}`}
            />
            <button
              onClick={runAssistantSearch}
              disabled={searching || query.trim().length < 3}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-40"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              value={localitySlug}
              onChange={(e) => setLocalitySlug(e.target.value)}
              className={`rounded-lg border px-2 py-1.5 text-xs outline-none ${selectClass}`}
            >
              {localities.length === 0 && <option value={localitySlug}>Localidad</option>}
              {localities.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className={`rounded-lg border px-2 py-1.5 text-xs outline-none ${selectClass}`}
            >
              {OPERATIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={`rounded-lg border px-2 py-1.5 text-xs outline-none ${selectClass}`}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!enable3d}
              onClick={() => setIs3d((value) => !value)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${selectClass} ${is3d ? 'ring-2 ring-cyan-400/50' : ''}`}
            >
              {is3d ? '3D activo' : '2D / 3D'}
            </button>
          </div>

          {results && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className={`truncate text-xs ${subtleClass}`}>{assistantAnswer || 'Resultados de busqueda'}</p>
              <button
                onClick={() => {
                  setResults(null);
                  setQuery('');
                  setAssistantAnswer(null);
                  setAssistantCaveats([]);
                  applyHighlightedIds([]);
                }}
                className={`shrink-0 rounded-lg border px-2 py-1 text-xs ${selectClass}`}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {results && (
          <div className={`pointer-events-auto max-h-[50vh] overflow-y-auto rounded-2xl border backdrop-blur ${resultsClass}`}>
            {assistantCaveats.length > 0 && (
              <div className={`border-b p-3 text-xs ${resultBorderClass} ${resultMutedClass}`}>
                {assistantCaveats.join(' ')}
              </div>
            )}
            {results.length === 0 ? (
              <p className={`p-4 text-sm ${subtleClass}`}>Sin resultados para esa busqueda.</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    flyTo(r);
                    openListing(r.id);
                  }}
                  className={`flex w-full gap-3 border-b p-3 text-left transition ${resultBorderClass} ${resultHoverClass}`}
                >
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-14 w-20 flex-none rounded-lg object-cover"
                    />
                  ) : (
                    <div className={`h-14 w-20 flex-none rounded-lg ${isLight || isSoft ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
                  )}
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${resultTitleClass}`}>
                      {formatPrice(r.price, r.price_currency)}
                    </div>
                    <div className={`truncate text-xs ${resultBodyClass}`}>{r.title}</div>
                    <div className={`truncate text-xs ${resultMutedClass}`}>
                      {r.ranking_reason || [r.zona, r.localidad].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {hoverPoint && hoverScreenPoint && (
        <ListingHoverCard
          point={hoverPoint}
          screenPoint={hoverScreenPoint}
          onMouseEnter={() => {
            hoverCardLocked.current = true;
            if (hoverHideTimer.current) window.clearTimeout(hoverHideTimer.current);
          }}
          onMouseLeave={() => {
            hoverCardLocked.current = false;
            hideHoverSoon();
          }}
          onOpen={() => openListing(hoverPoint.id)}
        />
      )}

      {selectedListingId && (
        <ListingModal
          listing={selectedListing}
          loading={listingLoading}
          onClose={closeListing}
        />
      )}
    </main>
  );
}

function ListingHoverCard({
  point,
  screenPoint,
  onMouseEnter,
  onMouseLeave,
  onOpen,
}: {
  point: MapPoint;
  screenPoint: { x: number; y: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpen: () => void;
}) {
  const width = 320;
  const left = Math.min(Math.max(screenPoint.x + 18, 12), Math.max(12, window.innerWidth - width - 12));
  const top = Math.min(Math.max(screenPoint.y - 92, 12), Math.max(12, window.innerHeight - 260));
  const facts = [
    point.ambientes ? `${point.ambientes} amb.` : null,
    point.bedrooms ? `${point.bedrooms} dorm.` : null,
    point.bathrooms ? `${point.bathrooms} bano${point.bathrooms > 1 ? 's' : ''}` : null,
    point.area_m2 ? `${point.area_m2} m2` : null,
  ].filter(Boolean);
  const expenses = formatMoney(point.expenses_amount, point.expenses_currency);

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto absolute z-20 overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-2xl"
      style={{ left, top, width }}
    >
      {point.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={point.image_url} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="h-28 w-full bg-zinc-200" />
      )}
      <div className="p-3 text-zinc-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
          {[formatOperation(point.tipo_operacion), formatType(point.property_type)].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{point.title || 'Propiedad'}</p>
        <p className="mt-2 text-2xl font-bold">{formatPrice(point.price, point.price_currency)}</p>
        <p className="mt-1 text-xs text-zinc-600">{facts.join(' | ')}</p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-zinc-600">
          {point.price_per_m2 ? <span>{Math.round(point.price_per_m2).toLocaleString('es-AR')} / m2</span> : <span>{point.zona || point.localidad}</span>}
          {point.days_on_market != null ? <span>{point.days_on_market} dias publicada</span> : null}
          {point.construction_year ? <span>Anno {point.construction_year}</span> : null}
          {expenses ? <span>Exp. {expenses}</span> : null}
        </div>
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-600">
          Ver ficha
        </div>
      </div>
    </button>
  );
}

function ListingModal({
  listing,
  loading,
  onClose,
}: {
  listing: ListingDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const images = (listing?.images_array || []).filter((src): src is string => typeof src === 'string' && Boolean(src));
  const heroImage = images[0] || listing?.image_url || null;
  const whatsapp = normalizeWhatsApp(listing?.inmobiliaria_whatsapp || listing?.inmobiliaria_phone);
  const facts: Array<[string, string]> = [];
  if (listing?.ambientes) facts.push(['Ambientes', String(listing.ambientes)]);
  if (listing?.bedrooms) facts.push(['Dormitorios', String(listing.bedrooms)]);
  if (listing?.bathrooms) facts.push(['Banos', String(listing.bathrooms)]);
  if (listing?.area_m2) facts.push(['Superficie', `${listing.area_m2} m2`]);
  if (listing?.price_per_m2) facts.push(['Precio/m2', Math.round(listing.price_per_m2).toLocaleString('es-AR')]);
  if (listing?.days_on_market != null) facts.push(['Dias publicada', String(listing.days_on_market)]);
  if (listing?.construction_year) facts.push(['Anio', String(listing.construction_year)]);
  const expenses = formatMoney(listing?.expenses_amount, listing?.expenses_currency);
  if (expenses) facts.push(['Expensas', expenses]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-zinc-950/45 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl md:max-w-5xl md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-cyan-300">
              {listing ? [formatOperation(listing.tipo_operacion), formatType(listing.property_type)].filter(Boolean).join(' · ') : 'Cargando'}
            </p>
            <h2 className="truncate text-lg font-semibold text-white">
              {listing?.title || 'Propiedad'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 h-9 w-9 rounded-full border border-white/10 text-lg text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar ficha"
          >
            x
          </button>
        </div>

        {loading ? (
          <div className="flex h-80 items-center justify-center text-sm text-zinc-400">Cargando ficha...</div>
        ) : listing ? (
          <div className="grid max-h-[calc(92dvh-62px)] overflow-y-auto md:grid-cols-[1.1fr_0.9fr]">
            <section className="bg-zinc-900">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="" className="h-72 w-full object-cover md:h-full md:min-h-[560px]" />
              ) : (
                <div className="h-72 w-full bg-zinc-800 md:h-full md:min-h-[560px]" />
              )}
            </section>
            <section className="p-4 md:p-5">
              <p className="text-3xl font-bold text-cyan-300">
                {formatPrice(listing.price, listing.price_currency)}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {[listing.address, listing.zona, listing.localidad].filter(Boolean).join(' · ')}
              </p>

              {facts.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {facts.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className="text-sm font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {images.slice(1, 9).map((src, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${src}-${index}`} src={src} alt="" className="h-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {listing.description && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-white">Descripcion</h3>
                  <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                    {listing.description}
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">
                  Publicada por {listing.inmobiliaria || 'inmobiliaria'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                    >
                      WhatsApp
                    </a>
                  )}
                  {listing.tour_virtual && (
                    <a
                      href={listing.tour_virtual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
                    >
                      Tour virtual
                    </a>
                  )}
                  {(listing.source_listing_url || listing.detail_url) && (
                    <a
                      href={listing.source_listing_url || listing.detail_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
                    >
                      Publicacion original
                    </a>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-zinc-400">No pudimos cargar esta ficha.</div>
        )}
      </div>
    </div>
  );
}
