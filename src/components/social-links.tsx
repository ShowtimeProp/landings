type SocialNetworkKey =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "x"
  | "telegram"
  | "website";

type ThemeMode = "light" | "soft" | "dark";

type SocialNetworkDef = {
  key: SocialNetworkKey;
  label: string;
  hoverColorClass: string;
};

export type SocialLinksMap = Partial<Record<SocialNetworkKey, string>>;

const SOCIAL_NETWORK_DEFS: SocialNetworkDef[] = [
  { key: "instagram", label: "Instagram", hoverColorClass: "hover:text-pink-400" },
  { key: "facebook", label: "Facebook", hoverColorClass: "hover:text-blue-500" },
  { key: "linkedin", label: "LinkedIn", hoverColorClass: "hover:text-sky-400" },
  { key: "youtube", label: "YouTube", hoverColorClass: "hover:text-red-500" },
  { key: "tiktok", label: "TikTok", hoverColorClass: "hover:text-fuchsia-400" },
  { key: "x", label: "X", hoverColorClass: "hover:text-zinc-100" },
  { key: "telegram", label: "Telegram", hoverColorClass: "hover:text-cyan-400" },
  { key: "website", label: "Sitio web", hoverColorClass: "hover:text-emerald-400" },
];

function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export function normalizeSocialLinks(raw: unknown): SocialLinksMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const parsed = raw as Record<string, unknown>;
  const output: SocialLinksMap = {};

  for (const network of SOCIAL_NETWORK_DEFS) {
    const normalized = normalizeUrl(parsed[network.key]);
    if (normalized) output[network.key] = normalized;
  }
  return output;
}

export function socialLinkEntries(raw: unknown): Array<{ key: SocialNetworkKey; label: string; url: string; hoverColorClass: string }> {
  const normalized = normalizeSocialLinks(raw);
  return SOCIAL_NETWORK_DEFS
    .map((network) => {
      const url = normalized[network.key];
      if (!url) return null;
      return {
        key: network.key,
        label: network.label,
        url,
        hoverColorClass: network.hoverColorClass,
      };
    })
    .filter(Boolean) as Array<{ key: SocialNetworkKey; label: string; url: string; hoverColorClass: string }>;
}

export function SocialNetworkIcon({
  network,
  className = "h-4 w-4",
}: {
  network: SocialNetworkKey;
  className?: string;
}) {
  if (network === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (network === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M13.5 20v-6.5h2.4l.4-2.7h-2.8V9.2c0-.8.3-1.3 1.4-1.3H16V5.3c-.3-.1-1.2-.2-2.3-.2-2.2 0-3.7 1.3-3.7 3.8v1.9H7.8v2.7H10V20h3.5z" fill="currentColor" />
      </svg>
    );
  }
  if (network === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="4" y="9" width="3.6" height="11" fill="currentColor" />
        <circle cx="5.8" cy="5.8" r="1.8" fill="currentColor" />
        <path d="M10.2 20V9h3.4v1.6c.6-1 1.7-1.9 3.6-1.9 2.9 0 4.2 1.9 4.2 5.2V20H18v-5.5c0-1.6-.6-2.6-2-2.6-1.1 0-1.8.8-2.1 1.6-.1.3-.1.7-.1 1.1V20h-3.6z" fill="currentColor" />
      </svg>
    );
  }
  if (network === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3" y="6.5" width="18" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 9.5l5.2 2.5L10 14.5v-5z" fill="currentColor" />
      </svg>
    );
  }
  if (network === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M14.5 5.2c.7 1.1 1.8 1.8 3.1 2v2.5c-1.1-.1-2.1-.5-3.1-1.1v5.2a4.5 4.5 0 11-4.5-4.5c.2 0 .4 0 .7.1v2.6a1.9 1.9 0 10.9 1.7V4.7h2.9v.5z" fill="currentColor" />
      </svg>
    );
  }
  if (network === "x") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 4l6 7.6L5.4 20H8l4.2-5.5L16.6 20H20l-6.2-8L19 4h-2.6l-3.8 4.9L8.9 4H5z" fill="currentColor" />
      </svg>
    );
  }
  if (network === "telegram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M20 5L4 11.2l4.5 1.7L17 7.7l-6.4 6.1v4.2l2.6-2.2 4.1 3.2L20 5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.8 12h16.4M12 3.8a13 13 0 010 16.4M12 3.8a13 13 0 000 16.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function TenantSocialLinks({
  links,
  themeMode,
  className = "",
}: {
  links: unknown;
  themeMode: ThemeMode;
  className?: string;
}) {
  const entries = socialLinkEntries(links);
  if (!entries.length) return null;

  const baseButtonClass =
    themeMode === "light"
      ? "border-zinc-300 bg-zinc-100 text-zinc-500 hover:border-zinc-400"
      : "border-zinc-700 bg-zinc-900/70 text-zinc-400 hover:border-zinc-500";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Redes</span>
      {entries.map((entry) => (
        <a
          key={entry.key}
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          title={entry.label}
          aria-label={entry.label}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition duration-300 ${baseButtonClass} ${entry.hoverColorClass}`}
        >
          <SocialNetworkIcon network={entry.key} />
        </a>
      ))}
    </div>
  );
}

