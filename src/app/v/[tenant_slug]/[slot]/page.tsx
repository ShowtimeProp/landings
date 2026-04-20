"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TenantGtm from "@/components/TenantGtm";
import {
  appendCampaignParamsToUrl,
  captureCampaignFromLocation,
} from "@/lib/campaign-tracking";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://agent.showtimeprop.com";

export default function SlotLoaderPage() {
  const params = useParams();
  const tenantSlug = params.tenant_slug as string;
  const slot = params.slot as string;
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">(
    "loading"
  );
  const [message, setMessage] = useState<string>("");
  const [marketing, setMarketing] = useState<{
    gtm_enabled?: boolean;
    gtm_container_id?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!tenantSlug || !slot) return;

    const run = async () => {
      try {
        const campaign = captureCampaignFromLocation(tenantSlug);
        const visitorId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `qr-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const res = await fetch(
          `${BACKEND_URL}/api/slots/resolve-by-slug?tenant_slug=${encodeURIComponent(tenantSlug)}&slot=${encodeURIComponent(slot)}`
        );
        const data = await res.json();
        setMarketing(data?.marketing || null);

        if (data.status === "active" && data.property_id && data.tenant_id) {
          await fetch(`${BACKEND_URL}/api/track`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "qr_scan",
              tenant_id: data.tenant_id,
              property_id: data.property_id,
              slot: slot,
              visitor_id: visitorId,
              user_agent: navigator.userAgent,
              page_url: typeof window !== "undefined" ? window.location.href : "",
              ...campaign,
            }),
          }).catch(() => {});

          // Prioridad: URL-2 externa/canónica resuelta por backend.
          // Fallback: tour virtual legacy.
          const resolvedRedirect =
            (typeof data.redirect_url === "string" && data.redirect_url.trim()) ||
            (typeof data.landing_page_url === "string" && data.landing_page_url.trim()) ||
            "";

          if (resolvedRedirect) {
            const redirectWithCampaign = appendCampaignParamsToUrl(
              resolvedRedirect,
              campaign
            );
            setStatus("redirecting");
            window.location.href = redirectWithCampaign;
            return;
          }

          const tourUrl =
            typeof data.tour_virtual_url === "string" ? data.tour_virtual_url.trim() : "";
          if (tourUrl) {
            const sep = tourUrl.includes("?") ? "&" : "?";
            const redirectUrl = `${tourUrl}${sep}tenant_id=${data.tenant_id}&property_id=${data.property_id}&slot=${encodeURIComponent(
              slot
            )}`;
            const redirectWithCampaign = appendCampaignParamsToUrl(
              redirectUrl,
              campaign
            );
            setStatus("redirecting");
            window.location.href = redirectWithCampaign;
            return;
          }

          setMessage("Cartel activo, pero sin URL de destino configurada.");
        } else {
          setMessage(data.message || "Cartel no disponible.");
        }
        setStatus("error");
      } catch (e) {
        setMessage("Error al cargar. Intente más tarde.");
        setStatus("error");
      }
    };

    run();
  }, [tenantSlug, slot]);

  if (status === "loading" || status === "redirecting") {
    return (
    <>
      <TenantGtm marketing={marketing} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          background: "#111",
          color: "#fff",
        }}
      >
        <p>{status === "redirecting" ? "Redirigiendo..." : "Cargando..."}</p>
      </div>
    </>
  );
}

  return (
    <>
      <TenantGtm marketing={marketing} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          background: "#111",
          color: "#fff",
          padding: 24,
        }}
      >
        <h1>Cartel no disponible</h1>
        <p>{message}</p>
      </div>
    </>
  );
}
