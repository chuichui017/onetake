// Canvas 合成录制核心
// 创建离屏 Canvas，按 30fps 循环把所有元素（背景、视频、摄像头）画到 Canvas 上。
// 然后由 recorder.ts 用 canvas.captureStream() 录这个 Canvas。

function splitGradientArgs(s: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      result.push(s.slice(start, i));
      start = i + 1;
    }
  }
  result.push(s.slice(start));
  return result;
}

function directionToDeg(dir: string): number {
  switch (dir.replace(/\s+/g, ' ').trim().toLowerCase()) {
    case 'top':
      return 0;
    case 'right':
      return 90;
    case 'bottom':
      return 180;
    case 'left':
      return 270;
    case 'top right':
    case 'right top':
      return 45;
    case 'bottom right':
    case 'right bottom':
      return 135;
    case 'bottom left':
    case 'left bottom':
      return 225;
    case 'top left':
    case 'left top':
      return 315;
    default:
      return 180;
  }
}

function parseColorStops(
  parts: string[],
  startIndex: number
): { color: string; pos: number }[] {
  const stops: { color: string; pos: number }[] = [];
  for (let i = startIndex; i < parts.length; i++) {
    const p = parts[i].trim();
    const m = p.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    if (m) {
      stops.push({ color: m[1].trim(), pos: parseFloat(m[2]) / 100 });
    } else {
      stops.push({ color: p, pos: NaN });
    }
  }
  const n = stops.length;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(stops[i].pos)) {
      if (i === 0) stops[i].pos = 0;
      else if (i === n - 1) stops[i].pos = 1;
      else stops[i].pos = i / (n - 1);
    }
  }
  return stops;
}

function parseLinearGradient(
  str: string,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): CanvasGradient | null {
  const m = str.match(/^linear-gradient\((.+)\)$/i);
  if (!m) return null;
  const parts = splitGradientArgs(m[1]);
  if (parts.length < 2) return null;

  let angleDeg = 180;
  let stopsStart = 0;
  const first = parts[0].trim();
  const angleMatch = first.match(/^(-?\d+(?:\.\d+)?)deg$/i);
  if (angleMatch) {
    angleDeg = parseFloat(angleMatch[1]);
    stopsStart = 1;
  } else if (/^to\s+/i.test(first)) {
    angleDeg = directionToDeg(first.replace(/^to\s+/i, ''));
    stopsStart = 1;
  }

  const stops = parseColorStops(parts, stopsStart);
  if (stops.length < 2) return null;

  const rad = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = -Math.cos(rad);
  const L = Math.abs(w * ux) + Math.abs(h * uy);
  const cx = w / 2;
  const cy = h / 2;
  const x0 = cx - (L / 2) * ux;
  const y0 = cy - (L / 2) * uy;
  const x1 = cx + (L / 2) * ux;
  const y1 = cy + (L / 2) * uy;

  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const s of stops) {
    g.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color);
  }
  return g;
}

function parseRadialGradient(
  str: string,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): CanvasGradient | null {
  const m = str.match(/^radial-gradient\((.+)\)$/i);
  if (!m) return null;
  const parts = splitGradientArgs(m[1]);
  if (parts.length < 2) return null;

  let stopsStart = 0;
  const first = parts[0].trim();
  if (
    /^(circle|ellipse|closest-|farthest-)/i.test(first) ||
    /\bat\b/i.test(first)
  ) {
    stopsStart = 1;
  }

  const stops = parseColorStops(parts, stopsStart);
  if (stops.length < 2) return null;

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const s of stops) {
    g.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color);
  }
  return g;
}

export function parseCssBackground(
  value: string,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): string | CanvasGradient {
  const v = value.trim();
  if (/^linear-gradient\(/i.test(v)) {
    return parseLinearGradient(v, ctx, w, h) ?? v;
  }
  if (/^radial-gradient\(/i.test(v)) {
    return parseRadialGradient(v, ctx, w, h) ?? v;
  }
  return v;
}

export type BgPatternKind = 'dots' | 'grid' | 'diagonal' | 'cross';

export interface BgPattern {
  kind: BgPatternKind;
  color: string;
  scale: number;
}

export function buildPatternCanvas(
  cfg: BgPattern,
  width: number,
  height: number
): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const pCtx = c.getContext('2d');
  if (!pCtx) return null;

  pCtx.fillStyle = cfg.color;
  const s = Math.max(0.5, cfg.scale);
  const lw = Math.max(1, Math.round(s));

  if (cfg.kind === 'dots') {
    const tile = Math.max(2, 20 * s);
    const r = Math.max(0.5, s);
    for (let y = tile / 2; y < height; y += tile) {
      for (let x = tile / 2; x < width; x += tile) {
        pCtx.beginPath();
        pCtx.arc(x, y, r, 0, Math.PI * 2);
        pCtx.fill();
      }
    }
  } else if (cfg.kind === 'grid') {
    const tile = Math.max(2, 24 * s);
    for (let y = 0; y < height; y += tile) pCtx.fillRect(0, y, width, lw);
    for (let x = 0; x < width; x += tile) pCtx.fillRect(x, 0, lw, height);
  } else if (cfg.kind === 'cross') {
    const tile = Math.max(2, 32 * s);
    for (let y = 0; y < height; y += tile) pCtx.fillRect(0, y, width, lw);
    for (let x = 0; x < width; x += tile) pCtx.fillRect(x, 0, lw, height);
  } else if (cfg.kind === 'diagonal') {
    const period = Math.max(2, 9 * s);
    const stripe = lw;
    const span = (width + height) * 1.5;
    pCtx.save();
    pCtx.translate(width / 2, height / 2);
    pCtx.rotate(Math.PI / 4);
    for (let i = -span / 2; i < span / 2; i += period) {
      pCtx.fillRect(-span, i, span * 2, stripe);
    }
    pCtx.restore();
  }

  return c;
}

export type WebcamShapeOut = 'circle' | 'rounded' | 'square';

export interface VideoRect {
  x: number;
  y: number;
  w: number;
  h: number;
  borderRadius: number;
  shadow: { blur: number; offsetY: number; color: string } | null;
}

export interface WebcamRect {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: WebcamShapeOut;
  containerX: number;
  containerY: number;
  containerW: number;
  containerH: number;
}

export interface CompositorConfig {
  width: number;
  height: number;
  uploadedVideoEl: HTMLVideoElement | null;
  webcamVideoEl: HTMLVideoElement | null;
  backgroundColor: string;
  bgPattern: BgPattern | null;
  recordWithBackground: boolean;
  getVideoRect: () => VideoRect | null;
  getWebcamRect: () => WebcamRect | null;
}

export interface Compositor {
  canvas: HTMLCanvasElement;
  start: () => void;
  stop: () => void;
}

export function createCompositor(config: CompositorConfig): Compositor {
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

  let running = false;
  let rafId: number | null = null;

  const patternCanvas = config.bgPattern
    ? buildPatternCanvas(config.bgPattern, config.width, config.height)
    : null;

  const roundedRectPath = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + radius, y);
    c.arcTo(x + w, y, x + w, y + h, radius);
    c.arcTo(x + w, y + h, x, y + h, radius);
    c.arcTo(x, y + h, x, y, radius);
    c.arcTo(x, y, x + w, y, radius);
    c.closePath();
  };

  const drawFrame = () => {
    if (!running) return;

    if (config.recordWithBackground) {
      ctx.fillStyle = parseCssBackground(
        config.backgroundColor,
        ctx,
        config.width,
        config.height
      );
      ctx.fillRect(0, 0, config.width, config.height);
      if (patternCanvas) {
        ctx.drawImage(patternCanvas, 0, 0);
      }
    } else {
      ctx.clearRect(0, 0, config.width, config.height);
    }

    if (config.uploadedVideoEl && config.uploadedVideoEl.readyState >= 2) {
      const rect = config.getVideoRect();
      if (rect && rect.w > 0 && rect.h > 0) {
        ctx.save();
        if (rect.shadow) {
          ctx.fillStyle = '#000';
          ctx.shadowColor = rect.shadow.color;
          ctx.shadowBlur = rect.shadow.blur;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = rect.shadow.offsetY;
          roundedRectPath(
            ctx,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            rect.borderRadius
          );
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }
        roundedRectPath(
          ctx,
          rect.x,
          rect.y,
          rect.w,
          rect.h,
          rect.borderRadius
        );
        ctx.clip();
        try {
          ctx.drawImage(config.uploadedVideoEl, rect.x, rect.y, rect.w, rect.h);
        } catch {
          // frame not ready; skip
        }
        ctx.restore();
      }
    }

    if (config.webcamVideoEl && config.webcamVideoEl.readyState >= 2) {
      const rect = config.getWebcamRect();
      if (rect && rect.w > 0 && rect.h > 0) {
        ctx.save();
        ctx.beginPath();
        if (rect.shape === 'circle') {
          const cx = rect.containerX + rect.containerW / 2;
          const cy = rect.containerY + rect.containerH / 2;
          const r = Math.min(rect.containerW, rect.containerH) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else if (rect.shape === 'rounded') {
          roundedRectPath(
            ctx,
            rect.containerX,
            rect.containerY,
            rect.containerW,
            rect.containerH,
            24
          );
        } else {
          ctx.rect(
            rect.containerX,
            rect.containerY,
            rect.containerW,
            rect.containerH
          );
        }
        ctx.clip();
        try {
          ctx.drawImage(config.webcamVideoEl, rect.x, rect.y, rect.w, rect.h);
        } catch {
          // frame not ready; skip
        }
        ctx.restore();
      }
    }

    rafId = requestAnimationFrame(drawFrame);
  };

  return {
    canvas,
    start: () => {
      if (running) return;
      running = true;
      drawFrame();
    },
    stop: () => {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
