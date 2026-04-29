import type { BackgroundState } from './store';

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: string, amount: number, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getColorBrightness(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function extractFirstColor(gradient: string): string | null {
  const match = gradient.match(/#[0-9A-Fa-f]{6}/);
  return match ? match[0] : null;
}

function resolveBaseColor(bg: BackgroundState): string | null {
  if (bg.type === 'solid') return bg.value || null;
  if (bg.type === 'gradient') return extractFirstColor(bg.value);
  if (bg.type === 'pattern') return bg.patternBase || null;
  if (bg.type === 'blur') return bg.patternBase || null;
  return null;
}

export function isStageDark(bg: BackgroundState, stageColor: string): boolean {
  const base = bg.type === 'default' ? stageColor : resolveBaseColor(bg);
  if (!base) return false;
  return getColorBrightness(base) < 0.5;
}

export function getSmartShadow(bg: BackgroundState): string {
  if (bg.type === 'default') {
    return [
      '0 1px 3px rgba(0, 0, 0, 0.05)',
      '0 6px 16px rgba(0, 0, 0, 0.07)',
      '0 24px 48px rgba(0, 0, 0, 0.08)',
    ].join(', ');
  }

  const base = resolveBaseColor(bg);
  if (!base) {
    return [
      '0 6px 20px rgba(0, 0, 0, 0.10)',
      '0 24px 48px rgba(0, 0, 0, 0.10)',
    ].join(', ');
  }

  const brightness = getColorBrightness(base);

  if (brightness > 0.75) {
    return [
      `0 1px 3px ${darken(base, 0.7, 0.08)}`,
      `0 6px 16px ${darken(base, 0.7, 0.1)}`,
      `0 24px 48px ${darken(base, 0.7, 0.12)}`,
    ].join(', ');
  }

  if (brightness < 0.25) {
    return [
      '0 2px 6px rgba(0, 0, 0, 0.3)',
      '0 12px 32px rgba(0, 0, 0, 0.4)',
      '0 40px 80px rgba(0, 0, 0, 0.5)',
    ].join(', ');
  }

  return [
    `0 2px 4px ${darken(base, 0.6, 0.15)}`,
    `0 8px 20px ${darken(base, 0.6, 0.18)}`,
    `0 28px 56px ${darken(base, 0.6, 0.22)}`,
  ].join(', ');
}
