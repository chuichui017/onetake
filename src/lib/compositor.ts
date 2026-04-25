// Canvas 合成录制核心
// 创建离屏 Canvas，按 30fps 循环把所有元素（背景、视频、摄像头）画到 Canvas 上。
// 然后由 recorder.ts 用 canvas.captureStream() 录这个 Canvas。

export type WebcamShapeOut = 'circle' | 'rounded' | 'square';

export interface VideoRect {
  x: number;
  y: number;
  w: number;
  h: number;
  borderRadius: number;
  containerX: number;
  containerY: number;
  containerW: number;
  containerH: number;
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

    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, config.width, config.height);

    if (config.uploadedVideoEl && config.uploadedVideoEl.readyState >= 2) {
      const rect = config.getVideoRect();
      if (rect && rect.w > 0 && rect.h > 0) {
        ctx.save();
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(
          rect.containerX,
          rect.containerY,
          rect.containerW,
          rect.containerH
        );
        ctx.beginPath();
        ctx.rect(
          rect.containerX,
          rect.containerY,
          rect.containerW,
          rect.containerH
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
