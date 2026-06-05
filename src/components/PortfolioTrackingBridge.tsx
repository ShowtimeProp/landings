"use client";

import { useEffect } from "react";
import {
  campaignIdentityKey,
  captureCurrentCampaignFromLocation,
} from "@/lib/campaign-tracking";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://agent.showtimeprop.com";

type Props = {
  tenantId: string;
  tenantSlug: string;
};

export default function PortfolioTrackingBridge({ tenantId, tenantSlug }: Props) {
  useEffect(() => {
    if (!tenantId || !tenantSlug) return;
    const campaign = captureCurrentCampaignFromLocation(tenantSlug);
    const sessionKey = `sp-portfolio-view:${tenantSlug}:${campaignIdentityKey(campaign)}`;

    const track = async (eventType: "portfolio_view" | "whatsapp_click") => {
      await fetch(`${BACKEND_URL}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          tenant_id: tenantId,
          user_agent: navigator.userAgent,
          page_url: window.location.href,
          ...campaign,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    const alreadyTracked = window.sessionStorage.getItem(sessionKey) === "1";
    if (!alreadyTracked) {
      track("portfolio_view");
      window.sessionStorage.setItem(sessionKey, "1");
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.('[data-track-whatsapp="true"]');
      if (!link) return;
      track("whatsapp_click");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [tenantId, tenantSlug]);

  return null;
}
