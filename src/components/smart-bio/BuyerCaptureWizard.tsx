'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BuyerFormData = {
  full_name: string;
  email: string;
  phone: string;
  objective: string;
  property_type: string;
  financing: string;
  budget_range: string;
  purchase_timeline: string;
};

const STEPS = [
  { id: 'contact', title: 'Contacto' },
  { id: 'profile', title: 'Objetivo' },
  { id: 'capacity', title: 'Capacidad' },
  { id: 'thanks', title: 'Listo' },
] as const;

const OBJECTIVES = [
  { value: 'live', label: 'Comprar para vivir', priority: 'normal' as const },
  { value: 'invest', label: 'Invertir para rentar o vender', priority: 'high' as const },
];

const PROPERTY_TYPES = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'terreno', label: 'Terreno' },
];

const FINANCING = [
  { value: 'own_funds', label: 'Fondos propios / Contado' },
  { value: 'mortgage_approved', label: 'Crédito hipotecario aprobado' },
  { value: 'need_credit_help', label: 'Necesito ayuda para tramitar un crédito' },
  { value: 'own_plus_credit', label: 'Fondos propios + crédito' },
];

const BUDGET_RANGES = [
  { value: 'lt_80k', label: 'Hasta USD 80.000' },
  { value: '80k_150k', label: 'USD 80.000 – 150.000' },
  { value: '150k_250k', label: 'USD 150.000 – 250.000' },
  { value: '250k_400k', label: 'USD 250.000 – 400.000' },
  { value: 'gt_400k', label: 'Más de USD 400.000' },
];

const TIMELINES = [
  { value: 'immediate', label: 'Inmediato (menos de 3 meses)', temperature: 'hot', priority: 'high' as const },
  { value: 'short', label: 'Corto plazo (3 a 6 meses)', temperature: 'warm', priority: 'normal' as const },
  { value: 'researching', label: 'Solo estoy investigando el mercado', temperature: 'cold', priority: 'low' as const },
];

const EMPTY_FORM: BuyerFormData = {
  full_name: '',
  email: '',
  phone: '',
  objective: '',
  property_type: '',
  financing: '',
  budget_range: '',
  purchase_timeline: '',
};

const contentVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.18 } },
};

function storageKey(slug: string) {
  return `sp_bio_buyer_${slug}`;
}

function buildCaptureFields(formData: BuyerFormData, step: number) {
  const base: Record<string, unknown> = { funnel: 'buyer_prequalification' };
  if (step >= 1) {
    base.objective = formData.objective;
    base.property_type = formData.property_type;
  }
  if (step >= 2) {
    base.financing = formData.financing;
    base.budget_range = formData.budget_range;
    base.purchase_timeline = formData.purchase_timeline;
    base.lead_temperature =
      TIMELINES.find((item) => item.value === formData.purchase_timeline)?.temperature || 'warm';
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

export default function BuyerCaptureWizard({ backendUrl, slug, lang, pageUrl, onTrack }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [formData, setFormData] = useState<BuyerFormData>(EMPTY_FORM);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(slug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { leadId?: string; formData?: BuyerFormData; step?: number };
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

  const updateField = <K extends keyof BuyerFormData>(field: K, value: BuyerFormData[K]) => {
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
        return formData.objective !== '' && formData.property_type !== '';
      case 2:
        return (
          formData.financing !== '' &&
          formData.budget_range !== '' &&
          formData.purchase_timeline !== ''
        );
      default:
        return true;
    }
  };

  const priority = useMemo(() => {
    const fromTimeline = TIMELINES.find((item) => item.value === formData.purchase_timeline)?.priority;
    if (fromTimeline) return fromTimeline;
    return OBJECTIVES.find((item) => item.value === formData.objective)?.priority || 'normal';
  }, [formData.objective, formData.purchase_timeline]);

  const stepMessage = (step: number) => {
    if (step === 1) return 'Compra paso 1: datos de contacto';
    if (step === 2) {
      return `Compra paso 2: objetivo ${formData.objective} · tipo ${formData.property_type}`;
    }
    if (step === 3) {
      return `Compra paso 3: financiamiento ${formData.financing} · presupuesto ${formData.budget_range} · plazo ${formData.purchase_timeline}`;
    }
    return 'Precalificación compra Smart Bio';
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
        intent: 'buyer_capture',
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
      onTrack?.('bio_buyer_step', { step: wizardStep, lead_id: nextLeadId });
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

  const selectClass =
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
                  <h3 className="text-lg font-semibold">Perfil y objetivo</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Nos ayuda a segmentar tu búsqueda.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cuál es tu objetivo principal?</p>
                  <div className="space-y-2">
                    {OBJECTIVES.map((item) => (
                      <button key={item.value} type="button" className={choiceClass(formData.objective === item.value)} onClick={() => updateField('objective', item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">¿Qué tipo de propiedad buscás?</label>
                  <select
                    className={selectClass}
                    value={formData.property_type}
                    onChange={(e) => updateField('property_type', e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {PROPERTY_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Capacidad y tiempo</h3>
                  <p className="mt-1 text-sm text-[var(--bio-muted)]">Calificación técnica para priorizar tu búsqueda.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cómo planeás financiar la adquisición?</p>
                  <div className="space-y-2">
                    {FINANCING.map((item) => (
                      <button key={item.value} type="button" className={choiceClass(formData.financing === item.value)} onClick={() => updateField('financing', item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tu presupuesto estimado es</p>
                  <div className="space-y-2">
                    {BUDGET_RANGES.map((item) => (
                      <button key={item.value} type="button" className={choiceClass(formData.budget_range === item.value)} onClick={() => updateField('budget_range', item.value)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">¿Cuándo tenés pensado realizar la compra?</p>
                  <div className="space-y-2">
                    {TIMELINES.map((item) => (
                      <button key={item.value} type="button" className={choiceClass(formData.purchase_timeline === item.value)} onClick={() => updateField('purchase_timeline', item.value)}>
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
                  Ya tenemos tu perfil de búsqueda. Te vamos a contactar con oportunidades alineadas a tu objetivo.
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
