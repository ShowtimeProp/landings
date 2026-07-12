'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RentalFormData = {
  full_name: string;
  email: string;
  phone: string;
  rental_type: '' | 'vacation' | 'long_term';
  // 3A vacation
  check_in: string;
  check_out: string;
  adults: string;
  children: string;
  stay_reason: string;
  // 3B long-term
  move_timeline: string;
  rent_budget: string;
  occupation: string;
  pets: string;
};

const STEPS = [
  { id: 'contact', title: 'Contacto' },
  { id: 'filter', title: 'Tipo' },
  { id: 'qualify', title: 'Calificación' },
  { id: 'thanks', title: 'Listo' },
] as const;

const RENTAL_TYPES = [
  { value: 'vacation' as const, label: 'Alquiler vacacional o temporal' },
  { value: 'long_term' as const, label: 'Alquiler a largo plazo / Vivienda permanente' },
];

const STAY_REASONS = [
  { value: 'vacation', label: 'Vacaciones / Turismo' },
  { value: 'work', label: 'Trabajo / Nómada digital' },
  { value: 'temporary_move', label: 'Mudanza temporal o salud' },
];

const MOVE_TIMELINES = [
  { value: 'immediate', label: 'De inmediato (menos de 30 días)', temperature: 'hot', priority: 'high' as const },
  { value: '1_2_months', label: 'En 1 o 2 meses', temperature: 'warm', priority: 'normal' as const },
  { value: 'evaluating', label: 'Solo estoy evaluando opciones', temperature: 'cold', priority: 'low' as const },
];

const RENT_BUDGETS = [
  { value: 'lt_500', label: 'Hasta USD 500 / mes' },
  { value: '500_800', label: 'USD 500 – 800 / mes' },
  { value: '800_1200', label: 'USD 800 – 1.200 / mes' },
  { value: '1200_2000', label: 'USD 1.200 – 2.000 / mes' },
  { value: 'gt_2000', label: 'Más de USD 2.000 / mes' },
];

const OCCUPATIONS = [
  { value: 'employee', label: 'Empleado en relación de dependencia' },
  { value: 'self_employed', label: 'Autónomo / Freelancer / Empresario' },
  { value: 'student_retiree', label: 'Estudiante / Jubilado' },
];

const PETS = [
  { value: 'none', label: 'No tengo mascotas' },
  { value: 'dogs', label: 'Sí, perro(s)' },
  { value: 'cats', label: 'Sí, gato(s)' },
  { value: 'other', label: 'Sí, otro tipo de mascota' },
];

const EMPTY_FORM: RentalFormData = {
  full_name: '',
  email: '',
  phone: '',
  rental_type: '',
  check_in: '',
  check_out: '',
  adults: '2',
  children: '0',
  stay_reason: '',
  move_timeline: '',
  rent_budget: '',
  occupation: '',
  pets: '',
};

const contentVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.18 } },
};

function storageKey(slug: string) {
  return `sp_bio_rental_${slug}`;
}

function buildCaptureFields(formData: RentalFormData, step: number) {
  const base: Record<string, unknown> = { funnel: 'rental_prequalification' };
  if (step >= 1) {
    base.rental_type = formData.rental_type;
  }
  if (step >= 2 && formData.rental_type === 'vacation') {
    Object.assign(base, {
      check_in: formData.check_in,
      check_out: formData.check_out,
      adults: formData.adults,
      children: formData.children,
      stay_reason: formData.stay_reason,
      lead_temperature: 'warm',
    });
  }
  if (step >= 2 && formData.rental_type === 'long_term') {
    const timeline = MOVE_TIMELINES.find((item) => item.value === formData.move_timeline);
    Object.assign(base, {
      move_timeline: formData.move_timeline,
      rent_budget: formData.rent_budget,
      occupation: formData.occupation,
      pets: formData.pets,
      lead_temperature: timeline?.temperature || 'warm',
    });
  }
  return base;
}

type Props = {
  backendUrl: string;
  slug: string;
  lang: 'es' | 'en' | 'pt';
  pageUrl: string;
  onTrack?: (eventType: string, eventData?: Record<string, unknown>) => void;
};

export default function RentalCaptureWizard({ backendUrl, slug, lang, pageUrl, onTrack }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [formData, setFormData] = useState<RentalFormData>(EMPTY_FORM);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(slug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { leadId?: string; formData?: RentalFormData; step?: number };
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
      sessionStorage.setItem(storageKey(slug), JSON.stringify({ leadId, formData, step: currentStep }));
    } catch {
      // ignore
    }
  }, [slug, leadId, formData, currentStep]);

  const updateField = <K extends keyof RentalFormData>(field: K, value: RentalFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return (
          formData.full_name.trim() !== '' &&
          formData.email.trim() !== '' &&
          formData.phone.trim() !== ''
        );
      case 1:
        return formData.rental_type === 'vacation' || formData.rental_type === 'long_term';
      case 2:
        if (formData.rental_type === 'vacation') {
          return (
            formData.check_in !== '' &&
            formData.check_out !== '' &&
            formData.check_out >= formData.check_in &&
            Number(formData.adults) >= 1 &&
            formData.stay_reason !== ''
          );
        }
        return (
          formData.move_timeline !== '' &&
          formData.rent_budget !== '' &&
          formData.occupation !== '' &&
          formData.pets !== ''
        );
      default:
        return true;
    }
  };

  const priority = useMemo(() => {
    if (formData.rental_type === 'long_term') {
      return MOVE_TIMELINES.find((item) => item.value === formData.move_timeline)?.priority || 'normal';
    }
    return 'normal';
  }, [formData.move_timeline, formData.rental_type]);

  const stepMessage = (step: number) => {
    if (step === 1) return 'Alquiler paso 1: datos de contacto';
    if (step === 2) return `Alquiler paso 2: tipo ${formData.rental_type}`;
    if (step === 3 && formData.rental_type === 'vacation') {
      return `Alquiler vacacional: ${formData.check_in} → ${formData.check_out} · ${formData.adults} adultos · ${formData.children} niños · ${formData.stay_reason}`;
    }
    if (step === 3) {
      return `Alquiler largo plazo: ${formData.move_timeline} · ${formData.rent_budget} · ${formData.occupation} · pets ${formData.pets}`;
    }
    return 'Precalificación alquiler Smart Bio';
  };

  const persistStep = async (wizardStep: number): Promise<string | null> => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        slug,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        intent: 'vacation_rental',
        lang,
        page_url: pageUrl,
        wizard_step: wizardStep,
        capture_fields: buildCaptureFields(formData, wizardStep - 1),
        message: stepMessage(wizardStep),
        lead_id: leadId || undefined,
      };
      if (wizardStep >= 3) payload.priority = priority;

      const res = await fetch(`${backendUrl}/api/smart-bios/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'No se pudo guardar el paso');
      const nextLeadId = data.lead_id ? String(data.lead_id) : leadId;
      if (nextLeadId) setLeadId(nextLeadId);
      onTrack?.('bio_rental_step', {
        step: wizardStep,
        lead_id: nextLeadId,
        rental_type: formData.rental_type,
      });
      return nextLeadId || '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (!isStepValid() || isSubmitting) return;
    if (currentStep >= 0 && currentStep <= 2) {
      const ok = await persistStep(currentStep + 1);
      if (ok === null) return;
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

  const qualifyTitle =
    formData.rental_type === 'long_term'
      ? 'Calificación para alquiler a largo plazo'
      : 'Calificación para alquiler vacacional';

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
          <motion.div key={`${currentStep}-${formData.rental_type}`} initial="hidden" animate="visible" exit="exit" variants={contentVariants} className="p-4 sm:p-5">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Información de contacto</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Datos indispensables para contactarte.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre y apellido</label>
                  <input className={inputClass} value={formData.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder="Tu nombre completo" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Correo electrónico</label>
                  <input className={inputClass} type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="tu@email.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Teléfono / WhatsApp</label>
                  <input className={inputClass} value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+54 9 ..." />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Filtro de intención</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">¿Qué tipo de alquiler estás buscando?</p>
                </div>
                <div className="space-y-2">
                  {RENTAL_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={choiceClass(formData.rental_type === item.value)}
                      onClick={() => updateField('rental_type', item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && formData.rental_type === 'vacation' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{qualifyTitle}</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Datos de la estadía temporal.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Check-in</label>
                    <input
                      className={inputClass}
                      type="date"
                      value={formData.check_in}
                      onChange={(e) => updateField('check_in', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Check-out</label>
                    <input
                      className={inputClass}
                      type="date"
                      value={formData.check_out}
                      min={formData.check_in || undefined}
                      onChange={(e) => updateField('check_out', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Adultos</label>
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      max={30}
                      value={formData.adults}
                      onChange={(e) => updateField('adults', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Niños</label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={30}
                      value={formData.children}
                      onChange={(e) => updateField('children', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cuál es el motivo de tu viaje o estancia?</p>
                  <div className="space-y-2">
                    {STAY_REASONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={choiceClass(formData.stay_reason === item.value)}
                        onClick={() => updateField('stay_reason', item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && formData.rental_type === 'long_term' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{qualifyTitle}</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Datos para calificar la búsqueda de vivienda.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cuándo necesitás mudarte?</p>
                  <div className="space-y-2">
                    {MOVE_TIMELINES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={choiceClass(formData.move_timeline === item.value)}
                        onClick={() => updateField('move_timeline', item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cuál es tu presupuesto máximo mensual de alquiler?</p>
                  <div className="space-y-2">
                    {RENT_BUDGETS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={choiceClass(formData.rent_budget === item.value)}
                        onClick={() => updateField('rent_budget', item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cuál es tu situación laboral u ocupación actual?</p>
                  <div className="space-y-2">
                    {OCCUPATIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={choiceClass(formData.occupation === item.value)}
                        onClick={() => updateField('occupation', item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Tenés mascotas?</p>
                  <div className="space-y-2">
                    {PETS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={choiceClass(formData.pets === item.value)}
                        onClick={() => updateField('pets', item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bio-primary)] text-[var(--bio-primary-fg)]">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">¡Gracias!</h3>
                <p className="text-sm text-[var(--bio-muted)]">
                  {formData.rental_type === 'vacation'
                    ? 'Ya tenemos tu consulta vacacional. Te contactamos con opciones según tus fechas.'
                    : 'Ya tenemos tu perfil de alquiler. Te vamos a contactar con viviendas alineadas a tu presupuesto.'}
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
              ) : currentStep === 2 ? (
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
