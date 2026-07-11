'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PublicAddressAutocomplete from '@/components/smart-bio/PublicAddressAutocomplete';

export type ValuationFormData = {
  full_name: string;
  phone: string;
  email: string;
  street: string;
  floor: string;
  unit: string;
  city: string;
  place_id: string;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  property_type: string;
  area_total: string;
  area_covered: string;
  bedrooms: string;
  bathrooms: string;
  amenities: string[];
  sale_purpose: string;
  sell_timeline: string;
};

const STEPS = [
  { id: 'contact', title: 'Contacto' },
  { id: 'property', title: 'Propiedad' },
  { id: 'amenities', title: 'Extras' },
  { id: 'purpose', title: 'Propósito' },
  { id: 'timeline', title: 'Plazo' },
  { id: 'thanks', title: 'Listo' },
] as const;

const PROPERTY_TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'ph', label: 'PH' },
  { value: 'local', label: 'Local comercial' },
];

const COUNT_OPTIONS = ['1', '2', '3', '4', '5+'];

const AMENITIES = [
  { value: 'cochera', label: 'Cochera' },
  { value: 'balcon', label: 'Balcón' },
  { value: 'patio', label: 'Patio' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'piscina', label: 'Piscina' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'vista_frente', label: 'Vista al frente' },
  { value: 'vista_mar', label: 'Vista al mar' },
];

const SALE_PURPOSES = [
  { value: 'sell_fast', label: 'Quiero vender rápido', priority: 'high' as const },
  { value: 'price_curiosity', label: 'Solo tengo curiosidad por el precio', priority: 'low' as const },
  { value: 'sell_to_buy', label: 'Quiero vender para comprar otra propiedad', priority: 'normal' as const },
];

const TIMELINES = [
  { value: 'lt_3m', label: 'Menos de 3 meses' },
  { value: '3_to_6m', label: 'De 3 a 6 meses' },
  { value: 'gt_6m', label: 'Más de 6 meses' },
];

const EMPTY_FORM: ValuationFormData = {
  full_name: '',
  phone: '',
  email: '',
  street: '',
  floor: '',
  unit: '',
  city: '',
  place_id: '',
  formatted_address: '',
  latitude: null,
  longitude: null,
  property_type: '',
  area_total: '',
  area_covered: '',
  bedrooms: '',
  bathrooms: '',
  amenities: [],
  sale_purpose: '',
  sell_timeline: '',
};

const contentVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.18 } },
};

function storageKey(slug: string) {
  return `sp_bio_valuation_${slug}`;
}

type Props = {
  backendUrl: string;
  slug: string;
  tenantSlug: string;
  lang: 'es' | 'en' | 'pt';
  pageUrl: string;
  onTrack?: (eventType: string, eventData?: Record<string, unknown>) => void;
};

export default function SellerValuationWizard({
  backendUrl,
  slug,
  tenantSlug,
  lang,
  pageUrl,
  onTrack,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [formData, setFormData] = useState<ValuationFormData>(EMPTY_FORM);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(slug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { leadId?: string; formData?: ValuationFormData; step?: number };
      if (parsed.formData) setFormData({ ...EMPTY_FORM, ...parsed.formData });
      if (parsed.leadId) setLeadId(parsed.leadId);
      if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < STEPS.length) {
        setCurrentStep(parsed.step);
      }
    } catch {
      // ignore
    }
  }, [slug]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        storageKey(slug),
        JSON.stringify({ leadId, formData, step: currentStep })
      );
    } catch {
      // ignore
    }
  }, [slug, leadId, formData, currentStep]);

  const updateField = <K extends keyof ValuationFormData>(field: K, value: ValuationFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (value: string) => {
    setFormData((prev) => {
      const amenities = prev.amenities.includes(value)
        ? prev.amenities.filter((item) => item !== value)
        : [...prev.amenities, value];
      return { ...prev, amenities };
    });
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.full_name.trim() !== '' && (formData.phone.trim() !== '' || formData.email.trim() !== '');
      case 1:
        return (
          formData.street.trim() !== '' &&
          formData.city.trim() !== '' &&
          formData.property_type !== '' &&
          formData.area_total.trim() !== '' &&
          formData.bedrooms !== '' &&
          formData.bathrooms !== ''
        );
      case 2:
        return true;
      case 3:
        return formData.sale_purpose !== '';
      case 4:
        return formData.sell_timeline !== '';
      default:
        return true;
    }
  };

  const priorityForPurpose = useMemo(() => {
    return SALE_PURPOSES.find((item) => item.value === formData.sale_purpose)?.priority || 'normal';
  }, [formData.sale_purpose]);

  const buildCaptureFields = (step: number) => {
    const base: Record<string, unknown> = {
      funnel: 'seller_valuation',
    };
    if (step >= 1) {
      Object.assign(base, {
        street: formData.street,
        floor: formData.floor,
        unit: formData.unit,
        city: formData.city,
        place_id: formData.place_id,
        formatted_address: formData.formatted_address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        property_type: formData.property_type,
        area_total: formData.area_total,
        area_covered: formData.area_covered,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
      });
    }
    if (step >= 2) base.amenities = formData.amenities;
    if (step >= 3) {
      base.sale_purpose = formData.sale_purpose;
      base.lead_temperature =
        formData.sale_purpose === 'sell_fast' ? 'hot' : formData.sale_purpose === 'price_curiosity' ? 'cold' : 'warm';
    }
    if (step >= 4) base.sell_timeline = formData.sell_timeline;
    return base;
  };

  const stepMessage = (step: number) => {
    if (step === 1) return 'Valuación paso 1: datos de contacto';
    if (step === 2) {
      return `Valuación paso 2: ${formData.property_type || 'propiedad'} en ${formData.city || formData.street}`;
    }
    if (step === 3) return `Valuación paso 3: amenities ${formData.amenities.join(', ') || 'ninguno'}`;
    if (step === 4) return `Valuación paso 4: propósito ${formData.sale_purpose}`;
    if (step === 5) return `Valuación paso 5: plazo ${formData.sell_timeline}`;
    return 'Valuación Smart Bio';
  };

  const persistStep = async (wizardStep: number) => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        slug,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        intent: 'seller_capture',
        lang,
        page_url: pageUrl,
        wizard_step: wizardStep,
        capture_fields: buildCaptureFields(wizardStep - 1),
        message: stepMessage(wizardStep),
        lead_id: leadId || undefined,
      };
      if (wizardStep >= 4) payload.priority = priorityForPurpose;

      const res = await fetch(`${backendUrl}/api/smart-bios/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'No se pudo guardar el paso');
      if (data.lead_id) setLeadId(String(data.lead_id));
      onTrack?.('bio_valuation_step', { step: wizardStep, lead_id: data.lead_id });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (!isStepValid() || isSubmitting) return;
    if (currentStep >= 0 && currentStep <= 4) {
      const ok = await persistStep(currentStep + 1);
      if (!ok) return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0 && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const choiceClass = (active: boolean) =>
    cn(
      'flex min-h-11 items-center rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
      active
        ? 'border-[var(--bio-primary)] bg-[var(--bio-primary)]/10 text-[var(--bio-text)] ring-2 ring-[var(--bio-primary)]/20'
        : 'border-[var(--bio-border)] bg-[var(--bio-surface)] text-[var(--bio-text)] hover:border-[var(--bio-primary)]'
    );

  const inputClass =
    'h-11 w-full rounded-xl border border-[var(--bio-border)] bg-[var(--bio-bg)] px-3 text-sm text-[var(--bio-text)] outline-none transition focus:border-[var(--bio-primary)]';

  return (
    <div className="w-full py-1">
      <motion.div className="mb-5" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-2 flex justify-between gap-1">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className="flex flex-1 flex-col items-center"
              onClick={() => {
                if (index <= currentStep && index < STEPS.length - 1) setCurrentStep(index);
              }}
            >
              <span
                className={cn(
                  'h-3.5 w-3.5 rounded-full transition',
                  index < currentStep
                    ? 'bg-[var(--bio-primary)]'
                    : index === currentStep
                      ? 'bg-[var(--bio-primary)] ring-4 ring-[var(--bio-primary)]/25'
                      : 'bg-[var(--bio-border)]'
                )}
              />
              <span
                className={cn(
                  'mt-1 hidden text-[10px] sm:block',
                  index === currentStep ? 'font-semibold text-[var(--bio-primary)]' : 'text-[var(--bio-muted)]'
                )}
              >
                {step.title}
              </span>
            </button>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bio-border)]">
          <motion.div
            className="h-full bg-[var(--bio-primary)]"
            animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      </motion.div>

      <div className="overflow-hidden rounded-2xl border border-[var(--bio-border)] bg-[var(--bio-surface)] shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial="hidden" animate="visible" exit="exit" variants={contentVariants} className="p-4 sm:p-5">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Datos de contacto</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Empezamos por cómo contactarte.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre completo</label>
                  <input className={inputClass} value={formData.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder="Tu nombre" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Teléfono / WhatsApp</label>
                  <input className={inputClass} value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+54 9 ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <input className={inputClass} type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="tu@email.com" />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Datos de la propiedad</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Cuéntanos qué querés valuar.</p>
                </div>
                <PublicAddressAutocomplete
                  backendUrl={backendUrl}
                  tenantSlug={tenantSlug}
                  street={formData.street}
                  city={formData.city}
                  floor={formData.floor}
                  unit={formData.unit}
                  onStreetChange={(v) => updateField('street', v)}
                  onCityChange={(v) => updateField('city', v)}
                  onFloorChange={(v) => updateField('floor', v)}
                  onUnitChange={(v) => updateField('unit', v)}
                  onPlaceResolved={(details) => {
                    updateField('place_id', details.place_id || '');
                    updateField('formatted_address', details.formatted_address || '');
                    updateField('latitude', details.latitude ?? null);
                    updateField('longitude', details.longitude ?? null);
                  }}
                  inputClassName={inputClass}
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tipo de propiedad</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PROPERTY_TYPES.map((item) => (
                      <button key={item.value} type="button" className={choiceClass(formData.property_type === item.value)} onClick={() => updateField('property_type', item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">m² totales</label>
                    <input className={inputClass} inputMode="decimal" value={formData.area_total} onChange={(e) => updateField('area_total', e.target.value)} placeholder="120" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">m² cubiertos</label>
                    <input className={inputClass} inputMode="decimal" value={formData.area_covered} onChange={(e) => updateField('area_covered', e.target.value)} placeholder="90" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Dormitorios</p>
                  <div className="flex flex-wrap gap-2">
                    {COUNT_OPTIONS.map((item) => (
                      <button key={`bed-${item}`} type="button" className={cn(choiceClass(formData.bedrooms === item), 'min-w-12 justify-center')} onClick={() => updateField('bedrooms', item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Baños</p>
                  <div className="flex flex-wrap gap-2">
                    {COUNT_OPTIONS.map((item) => (
                      <button key={`bath-${item}`} type="button" className={cn(choiceClass(formData.bathrooms === item), 'min-w-12 justify-center')} onClick={() => updateField('bathrooms', item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Extras de valor</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Podés elegir más de uno.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {AMENITIES.map((item) => (
                    <button key={item.value} type="button" className={choiceClass(formData.amenities.includes(item.value))} onClick={() => toggleAmenity(item.value)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">¿Cuál es tu plan o propósito de venta?</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Elegí una opción.</p>
                </div>
                <div className="space-y-2">
                  {SALE_PURPOSES.map((item) => (
                    <button key={item.value} type="button" className={choiceClass(formData.sale_purpose === item.value)} onClick={() => updateField('sale_purpose', item.value)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">¿En cuánto tiempo necesitás vender?</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Elegí una opción.</p>
                </div>
                <div className="space-y-2">
                  {TIMELINES.map((item) => (
                    <button key={item.value} type="button" className={choiceClass(formData.sell_timeline === item.value)} onClick={() => updateField('sell_timeline', item.value)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bio-primary)] text-[var(--bio-primary-fg)]">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">¡Gracias!</h3>
                <p className="text-sm text-[var(--bio-muted)]">
                  Te estaremos enviando la valuación de tu propiedad en menos de 24hs.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {currentStep < STEPS.length - 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--bio-border)] px-4 py-4 sm:px-5">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0 || isSubmitting}
              className="inline-flex h-11 items-center gap-1 rounded-xl border border-[var(--bio-border)] px-4 text-sm font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
            <button
              type="button"
              onClick={() => void nextStep()}
              disabled={!isStepValid() || isSubmitting}
              className="inline-flex h-11 items-center gap-1 rounded-xl px-4 text-sm font-semibold text-[var(--bio-primary-fg)] disabled:opacity-50"
              style={{ background: 'var(--bio-primary)' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : currentStep === 4 ? (
                <>
                  Enviar <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      <p className="mt-3 text-center text-xs text-[var(--bio-muted)]">
        Paso {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
      </p>
    </div>
  );
}
