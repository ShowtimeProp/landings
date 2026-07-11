'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Prediction = { description: string; place_id: string };

type PlaceDetails = {
  formatted_address?: string;
  street?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
};

type Props = {
  backendUrl: string;
  tenantSlug: string;
  street: string;
  city: string;
  floor: string;
  unit: string;
  onStreetChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onFloorChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onPlaceResolved?: (details: PlaceDetails) => void;
  inputClassName?: string;
  labels?: {
    street?: string;
    city?: string;
    floor?: string;
    unit?: string;
  };
};

export default function PublicAddressAutocomplete({
  backendUrl,
  tenantSlug,
  street,
  city,
  floor,
  unit,
  onStreetChange,
  onCityChange,
  onFloorChange,
  onUnitChange,
  onPlaceResolved,
  inputClassName,
  labels,
}: Props) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipFetchRef = useRef(false);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!input || input.length < 2 || !tenantSlug) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const r = await fetch(
          `${backendUrl}/api/geocoding/public/places-autocomplete?tenant_slug=${encodeURIComponent(tenantSlug)}&input=${encodeURIComponent(input)}&types=address&language=es`
        );
        if (r.status === 403) {
          setEnabled(false);
          setSuggestions([]);
          return;
        }
        if (!r.ok) {
          setSuggestions([]);
          return;
        }
        const data = await r.json();
        setSuggestions(data.predictions || []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, tenantSlug]
  );

  useEffect(() => {
    if (!enabled || skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (street.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(street.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [street, enabled, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPrediction = async (prediction: Prediction) => {
    skipFetchRef.current = true;
    onStreetChange(prediction.description);
    setSuggestions([]);
    setShowDropdown(false);
    try {
      const r = await fetch(
        `${backendUrl}/api/geocoding/public/place-details?tenant_slug=${encodeURIComponent(tenantSlug)}&place_id=${encodeURIComponent(prediction.place_id)}`
      );
      if (!r.ok) return;
      const details = (await r.json()) as PlaceDetails;
      if (details.street) onStreetChange(details.street);
      if (details.city) onCityChange(details.city);
      onPlaceResolved?.(details);
    } catch {
      // keep typed address
    }
  };

  const fieldClass =
    inputClassName ||
    'h-11 w-full rounded-xl border border-[var(--bio-border)] bg-[var(--bio-bg)] px-3 text-sm text-[var(--bio-text)] outline-none focus:border-[var(--bio-primary)]';

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="relative space-y-1.5">
        <label className="text-sm font-medium text-[var(--bio-text)]">{labels?.street || 'Calle y número'}</label>
        <input
          value={street}
          onChange={(e) => onStreetChange(e.target.value)}
          onFocus={() => suggestions.length && setShowDropdown(true)}
          className={fieldClass}
          placeholder="Ej: Av. Colón 1234"
          autoComplete="street-address"
        />
        {loading ? <p className="text-xs text-[var(--bio-muted)]">Buscando direcciones...</p> : null}
        {!enabled ? <p className="text-xs text-[var(--bio-muted)]">Autocomplete no disponible; completá la dirección manualmente.</p> : null}
        {showDropdown && suggestions.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-[var(--bio-border)] bg-[var(--bio-surface)] shadow-lg">
            {suggestions.map((item) => (
              <li key={item.place_id}>
                <button
                  type="button"
                  className={cn('w-full px-3 py-2.5 text-left text-sm text-[var(--bio-text)] hover:bg-[var(--bio-bg)]')}
                  onClick={() => void selectPrediction(item)}
                >
                  {item.description}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels?.floor || 'Piso'}</label>
          <input value={floor} onChange={(e) => onFloorChange(e.target.value)} className={fieldClass} placeholder="Ej: 3" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{labels?.unit || 'Depto'}</label>
          <input value={unit} onChange={(e) => onUnitChange(e.target.value)} className={fieldClass} placeholder="Ej: B" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{labels?.city || 'Localidad'}</label>
        <input value={city} onChange={(e) => onCityChange(e.target.value)} className={fieldClass} placeholder="Ej: Mar del Plata" />
      </div>
    </div>
  );
}
