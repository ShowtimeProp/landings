export type BioPreset = 'standard' | 'luxury' | 'relaxed' | 'custom';
export type BioMode = 'light' | 'soft' | 'dark';
export type BioButtonStyle = 'solid' | 'outline' | 'pill' | 'sharp';

export type SmartBioThemeConfig = {
  preset?: BioPreset | string | null;
  modeDefault?: BioMode | string | null;
  mode?: BioMode | string | null;
  custom?: {
    primary?: string | null;
    accent?: string | null;
    background?: string | null;
    buttonStyle?: BioButtonStyle | string | null;
  } | null;
};

export type BioThemeTokens = {
  preset: BioPreset;
  mode: BioMode;
  buttonStyle: BioButtonStyle;
  vars: Record<string, string>;
  fontClass: string;
  radiusClass: string;
  cardClass: string;
  ctaClass: string;
  mutedTextClass: string;
  borderClass: string;
};

const PRESET_FONTS: Record<BioPreset, string> = {
  standard: 'font-sans',
  luxury: 'font-[family-name:var(--bio-font-display)]',
  relaxed: 'font-sans',
  custom: 'font-sans',
};

function normalizePreset(raw: unknown): BioPreset {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'luxury' || value === 'relaxed' || value === 'custom') return value;
  return 'standard';
}

export function normalizeMode(raw: unknown): BioMode {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'light') return 'light';
  if (value === 'soft' || value === 'neutral' || value === 'mid') return 'soft';
  if (value === 'dark') return 'dark';
  return 'light';
}

export function nextMode(mode: BioMode): BioMode {
  if (mode === 'dark') return 'soft';
  if (mode === 'soft') return 'light';
  return 'dark';
}

export function modeLabel(mode: BioMode, lang: 'es' | 'en' | 'pt' = 'es'): string {
  if (lang === 'en') {
    if (mode === 'light') return 'Light theme';
    if (mode === 'soft') return 'Soft theme';
    return 'Dark theme';
  }
  if (lang === 'pt') {
    if (mode === 'light') return 'Tema claro';
    if (mode === 'soft') return 'Tema suave';
    return 'Tema escuro';
  }
  if (mode === 'light') return 'Tema claro';
  if (mode === 'soft') return 'Tema suave';
  return 'Tema oscuro';
}

function palette(preset: BioPreset, mode: BioMode, custom?: SmartBioThemeConfig['custom']) {
  const customPrimary = String(custom?.primary || '').trim() || '#047857';
  const customAccent = String(custom?.accent || '').trim() || customPrimary;
  const customBg = String(custom?.background || '').trim();

  if (preset === 'luxury') {
    if (mode === 'dark') {
      return {
        bg: '#0c0b09',
        surface: '#171512',
        text: '#f5f0e8',
        muted: '#b8a99a',
        border: '#2e2922',
        primary: '#c6a15b',
        primaryFg: '#0c0b09',
        accent: '#c6a15b',
      };
    }
    if (mode === 'soft') {
      return {
        bg: '#ece7df',
        surface: '#f7f3ec',
        text: '#1c1916',
        muted: '#6f655a',
        border: '#d6cfc3',
        primary: '#8a6a2f',
        primaryFg: '#ffffff',
        accent: '#8a6a2f',
      };
    }
    return {
      bg: '#f8f5f0',
      surface: '#ffffff',
      text: '#141210',
      muted: '#6b6258',
      border: '#e4ddd3',
      primary: '#1a1714',
      primaryFg: '#f8f5f0',
      accent: '#a16207',
    };
  }

  if (preset === 'relaxed') {
    if (mode === 'dark') {
      return {
        bg: '#0f1715',
        surface: '#16201d',
        text: '#e8f2ef',
        muted: '#9bb0a8',
        border: '#24332e',
        primary: '#2dd4bf',
        primaryFg: '#042f2e',
        accent: '#5eead4',
      };
    }
    if (mode === 'soft') {
      return {
        bg: '#e8f2ef',
        surface: '#f4faf8',
        text: '#134e4a',
        muted: '#5f7d76',
        border: '#cfe3dd',
        primary: '#0f766e',
        primaryFg: '#ffffff',
        accent: '#0d9488',
      };
    }
    return {
      bg: '#f3faf7',
      surface: '#ffffff',
      text: '#134e4a',
      muted: '#5b736c',
      border: '#d7ebe4',
      primary: '#0f766e',
      primaryFg: '#ffffff',
      accent: '#14b8a6',
    };
  }

  if (preset === 'custom') {
    if (mode === 'dark') {
      return {
        bg: customBg || '#09090b',
        surface: '#18181b',
        text: '#fafafa',
        muted: '#a1a1aa',
        border: '#27272a',
        primary: customPrimary,
        primaryFg: '#ffffff',
        accent: customAccent,
      };
    }
    if (mode === 'soft') {
      return {
        bg: customBg || '#f4f4f5',
        surface: '#fafafa',
        text: '#18181b',
        muted: '#71717a',
        border: '#e4e4e7',
        primary: customPrimary,
        primaryFg: '#ffffff',
        accent: customAccent,
      };
    }
    return {
      bg: customBg || '#f6f7f4',
      surface: '#ffffff',
      text: '#09090b',
      muted: '#71717a',
      border: '#e4e4e7',
      primary: customPrimary,
      primaryFg: '#ffffff',
      accent: customAccent,
    };
  }

  // standard
  if (mode === 'dark') {
    return {
      bg: '#09090b',
      surface: '#18181b',
      text: '#fafafa',
      muted: '#a1a1aa',
      border: '#27272a',
      primary: '#34d399',
      primaryFg: '#052e1c',
      accent: '#10b981',
    };
  }
  if (mode === 'soft') {
    return {
      bg: '#eceee9',
      surface: '#f7f8f5',
      text: '#18181b',
      muted: '#71717a',
      border: '#d4d7d0',
      primary: '#047857',
      primaryFg: '#ffffff',
      accent: '#059669',
    };
  }
  return {
    bg: '#f6f7f4',
    surface: '#ffffff',
    text: '#09090b',
    muted: '#71717a',
    border: '#e4e4e7',
    primary: '#047857',
    primaryFg: '#ffffff',
    accent: '#059669',
  };
}

export function resolveBioTheme(config: SmartBioThemeConfig | null | undefined, mode: BioMode): BioThemeTokens {
  const preset = normalizePreset(config?.preset);
  const colors = palette(preset, mode, config?.custom);
  const buttonStyleRaw = String(config?.custom?.buttonStyle || 'solid').toLowerCase();
  const buttonStyle: BioButtonStyle =
    buttonStyleRaw === 'outline' || buttonStyleRaw === 'pill' || buttonStyleRaw === 'sharp'
      ? buttonStyleRaw
      : 'solid';

  const radiusClass =
    preset === 'luxury' ? 'rounded-lg' : preset === 'relaxed' ? 'rounded-2xl' : buttonStyle === 'sharp' ? 'rounded-md' : 'rounded-xl';

  const buttonRadius =
    buttonStyle === 'pill' ? 'rounded-full' : buttonStyle === 'sharp' ? 'rounded-md' : preset === 'relaxed' ? 'rounded-xl' : 'rounded-lg';

  const ctaClass =
    buttonStyle === 'outline'
      ? `${buttonRadius} border-2 font-semibold transition`
      : `${buttonRadius} font-semibold text-[var(--bio-primary-fg)] transition`;

  return {
    preset,
    mode,
    buttonStyle,
    fontClass: PRESET_FONTS[preset],
    radiusClass,
    cardClass: `${radiusClass} border bg-[var(--bio-surface)] shadow-sm`,
    ctaClass,
    mutedTextClass: 'text-[var(--bio-muted)]',
    borderClass: 'border-[var(--bio-border)]',
    vars: {
      '--bio-bg': colors.bg,
      '--bio-surface': colors.surface,
      '--bio-text': colors.text,
      '--bio-muted': colors.muted,
      '--bio-border': colors.border,
      '--bio-primary': colors.primary,
      '--bio-primary-fg': colors.primaryFg,
      '--bio-accent': colors.accent,
      '--bio-font-display': preset === 'luxury' ? '"Cinzel", "Times New Roman", serif' : 'inherit',
    },
  };
}
