'use client';

import OwnerValuationWizard, { type PersistStepArgs } from '@/components/owner-capture/OwnerValuationWizard';

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
  const persist = async ({ wizardStep, formData, leadId, captureFields, priority, message }: PersistStepArgs) => {
    const payload: Record<string, unknown> = {
      slug,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      intent: 'seller_capture',
      lang,
      page_url: pageUrl,
      wizard_step: wizardStep,
      capture_fields: captureFields,
      message,
      lead_id: leadId || undefined,
    };
    if (wizardStep >= 4) payload.priority = priority;

    const res = await fetch(`${backendUrl}/api/smart-bios/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'No se pudo guardar el paso');
    onTrack?.('bio_valuation_step', { step: wizardStep, lead_id: data.lead_id });
    return { lead_id: data.lead_id ? String(data.lead_id) : undefined };
  };

  return (
    <OwnerValuationWizard
      backendUrl={backendUrl}
      tenantSlug={tenantSlug}
      storageKey={`sp_bio_valuation_${slug}`}
      intent="seller"
      funnel="seller_valuation"
      onPersist={persist}
      onTrack={onTrack}
    />
  );
}
