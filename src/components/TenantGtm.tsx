"use client";

import Script from "next/script";

type TenantMarketingConfig = {
  gtm_enabled?: boolean;
  gtm_container_id?: string | null;
};

function normalizeContainerId(raw?: string | null): string | null {
  const value = String(raw || "").trim().toUpperCase();
  if (!value || !value.startsWith("GTM-")) return null;
  return value.slice(0, 36);
}

export default function TenantGtm({
  marketing,
}: {
  marketing?: TenantMarketingConfig | null;
}) {
  const containerId = normalizeContainerId(marketing?.gtm_container_id);
  const enabled = Boolean(marketing?.gtm_enabled) && Boolean(containerId);
  if (!enabled || !containerId) return null;

  return (
    <>
      <Script
        id={`sp-gtm-init-${containerId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${containerId}');
          `,
        }}
      />
    </>
  );
}
