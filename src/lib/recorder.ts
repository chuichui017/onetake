import {
  createCompositor,
  type VideoRect,
  type WebcamRect,
} from './compositor';

export interface RecordingOptions {
  width: number;
  height: number;
  recordWithBackground: boolean;
  backgroundColor: string;
  uploadedVideoEl: HTMLVideoElement | null;
  webcamVideoEl: HTMLVideoElement | null;
  getVideoRect: () => VideoRect | null;
  getWebcamRect: () => WebcamRect | null;
}

export interface Recording {
  stop: () => Promise<Blob>;
}

export function getResolutionForRatio(ratio: string): {
  width: number;
  height: number;
} {
  switch (ratio) {
    case '9:16':
      return { width: 1080, height: 1920 };
    case '16:9':
      return { width: 1920, height: 1080 };
    case '16:10':
      return { width: 1920, height: 1200 };
    case '3:4':
      return { width: 1080, height: 1440 };
    case '1:1':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1920, height: 1080 };
  }
}

export async function startCompositeRecording(
  options: RecordingOptions
): Promise<Recording> {
  const compositor = createCompositor({
    width: options.width,
    height: options.height,
    uploadedVideoEl: options.uploadedVideoEl,
    webcamVideoEl: options.webcamVideoEl,
    backgroundColor: options.backgroundColor,
    recordWithBackground: options.recordWithBackground,
    getVideoRect: options.getVideoRect,
    getWebcamRect: options.getWebcamRect,
  });

  compositor.start();

  await new Promise((r) => setTimeout(r, 200));

  const canvasStream = compositor.canvas.captureStream(30);

  let micStream: MediaStream | null = null;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    console.warn('麦克风获取失败（继续无声录制）:', err);
  }

  let videoAudioStream: MediaStream | null = null;
  if (options.uploadedVideoEl) {
    const el = options.uploadedVideoEl as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const capture = el.captureStream ?? el.mozCaptureStream;
    if (capture) {
      try {
        videoAudioStream = capture.call(el);
      } catch (err) {
        console.warn('上传视频音频获取失败:', err);
      }
    }
  }

  const finalStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(micStream?.getAudioTracks() ?? []),
    ...(videoAudioStream?.getAudioTracks() ?? []),
  ]);

  const mimeType = getSupportedMimeType(!options.recordWithBackground);
  const recorder = new MediaRecorder(finalStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let resolveStop: ((b: Blob) => void) | null = null;
  let rejectStop: ((err: unknown) => void) | null = null;
  const stopped = new Promise<Blob>((res, rej) => {
    resolveStop = res;
    rejectStop = rej;
  });

  recorder.onstop = () => {
    compositor.stop();
    canvasStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    resolveStop?.(new Blob(chunks, { type: mimeType }));
  };
  recorder.onerror = (e) => rejectStop?.(e);

  const stop = (): Promise<Blob> => {
    if (recorder.state !== 'inactive') recorder.stop();
    return stopped;
  };

  recorder.start(1000);
  return { stop };
}

function getSupportedMimeType(preferAlpha: boolean): string {
  const candidates = preferAlpha
    ? [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
    : [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
      ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function generateFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `OneTake-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}.webm`;
}

export type ScreenShareWebcamShape =
  | 'circle'
  | 'rect-h'
  | 'rect-v'
  | 'square'
  | 'full'
  | 'split-top'
  | 'split-bottom'
  | 'hidden';

export interface ScreenShareRecordingOptions {
  screenStream: MediaStream;
  webcamVideoEl: HTMLVideoElement | null;
  webcamShape: ScreenShareWebcamShape;
  webcamPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  backgroundColor: string;
  canvasRatio: '9:16' | '16:9' | '16:10' | '3:4' | '1:1';
}

export async function startScreenShareRecording(
  options: ScreenShareRecordingOptions
): Promise<Recording> {
  const track = options.screenStream.getVideoTracks()[0];
  if (!track) throw new Error('屏幕共享流缺少视频轨道');
  const { width, height } = getResolutionForRatio(options.canvasRatio);

  const screenVideoEl = document.createElement('video');
  screenVideoEl.srcObject = options.screenStream;
  screenVideoEl.muted = true;
  screenVideoEl.playsInline = true;
  await screenVideoEl.play().catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '0';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

  let running = true;
  let rafId: number | null = null;

  const roundedPath = (
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

  const drawScreenContain = (
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    if (
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight ||
      w <= 0 ||
      h <= 0
    ) {
      return;
    }
    const videoAspect = video.videoWidth / video.videoHeight;
    const areaAspect = w / h;
    let dw: number, dh: number, dx: number, dy: number;
    if (videoAspect > areaAspect) {
      dw = w;
      dh = w / videoAspect;
      dx = x;
      dy = y + (h - dh) / 2;
    } else {
      dh = h;
      dw = h * videoAspect;
      dy = y;
      dx = x + (w - dw) / 2;
    }
    try {
      ctx.drawImage(video, dx, dy, dw, dh);
    } catch {
      // frame not ready
    }
  };

  const drawWebcamCover = (
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number,
    shape: ScreenShareWebcamShape
  ) => {
    if (
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight ||
      w <= 0 ||
      h <= 0
    ) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (shape === 'square' || shape === 'rect-h' || shape === 'rect-v') {
      roundedPath(ctx, x, y, w, h, 24);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.clip();
    const videoAspect = video.videoWidth / video.videoHeight;
    const areaAspect = w / h;
    let dw: number, dh: number, dx: number, dy: number;
    if (videoAspect > areaAspect) {
      dh = h;
      dw = h * videoAspect;
      dy = y;
      dx = x - (dw - w) / 2;
    } else {
      dw = w;
      dh = w / videoAspect;
      dx = x;
      dy = y - (dh - h) / 2;
    }
    try {
      ctx.drawImage(video, dx, dy, dw, dh);
    } catch {
      // skip
    }
    ctx.restore();
  };

  let bgLogged = false;
  let layoutLogged = false;

  const drawFrame = () => {
    if (!running) return;

    if (!bgLogged) {
      bgLogged = true;

      console.log(
        '[screen-recorder] background:',
        options.backgroundColor,
        'canvas:',
        width,
        'x',
        height
      );
    }

    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const shape = options.webcamShape;
    const wcEl = options.webcamVideoEl;
    const pos = options.webcamPosition;

    if (shape === 'split-top' || shape === 'split-bottom') {
      const isTop = shape === 'split-top';
      const camAreaHeight = pos
        ? height * pos.height
        : height * 0.42;
      const camAreaY = isTop ? 0 : height - camAreaHeight;
      const screenAreaHeight = height - camAreaHeight;
      const screenAreaY = isTop ? camAreaHeight : 0;

      drawScreenContain(screenVideoEl, 0, screenAreaY, width, screenAreaHeight);

      if (wcEl) {
        drawWebcamCover(wcEl, 0, camAreaY, width, camAreaHeight, 'square');
      }

      if (!layoutLogged) {
        layoutLogged = true;

        console.log('[screen-recorder] split layout:', {
          shape,
          camAreaY,
          camAreaHeight,
          screenAreaY,
          screenAreaHeight,
        });
      }
    } else if (shape === 'full') {
      if (wcEl) {
        drawWebcamCover(wcEl, 0, 0, width, height, 'square');
      }
    } else if (shape === 'hidden') {
      drawScreenContain(screenVideoEl, 0, 0, width, height);
    } else {
      drawScreenContain(screenVideoEl, 0, 0, width, height);

      if (wcEl && pos) {
        const camX = width * pos.x;
        const camY = height * pos.y;
        const camW = width * pos.width;
        const camH = height * pos.height;

        if (!layoutLogged) {
          layoutLogged = true;

          console.log('[screen-recorder] overlay layout:', {
            shape,
            camX,
            camY,
            camW,
            camH,
          });
        }

        drawWebcamCover(wcEl, camX, camY, camW, camH, shape);
      }
    }

    rafId = requestAnimationFrame(drawFrame);
  };

  drawFrame();
  await new Promise((r) => setTimeout(r, 200));

  const canvasStream = canvas.captureStream(30);

  let micStream: MediaStream | null = null;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    console.warn('麦克风获取失败（继续无声录制）:', err);
  }

  const finalStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(micStream?.getAudioTracks() ?? []),
  ]);

  const mimeType = getSupportedMimeType(false);
  const recorder = new MediaRecorder(finalStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let resolveStop: ((b: Blob) => void) | null = null;
  let rejectStop: ((err: unknown) => void) | null = null;
  const stopped = new Promise<Blob>((res, rej) => {
    resolveStop = res;
    rejectStop = rej;
  });

  const cleanup = () => {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    canvasStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    screenVideoEl.srcObject = null;
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  };

  recorder.onstop = () => {
    cleanup();
    resolveStop?.(new Blob(chunks, { type: mimeType }));
  };
  recorder.onerror = (e) => {
    cleanup();
    rejectStop?.(e);
  };

  const stop = (): Promise<Blob> => {
    if (recorder.state !== 'inactive') recorder.stop();
    return stopped;
  };

  recorder.start(1000);
  return { stop };
}

export function isRecordingSupported() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return {
      supported: false,
      reason: '浏览器不支持录制，请使用 Chrome / Edge 最新版',
    };
  }
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, reason: '浏览器缺少录制 API' };
  }
  if (typeof HTMLCanvasElement === 'undefined') {
    return { supported: false, reason: '浏览器不支持 Canvas 录制' };
  }
  return { supported: true as const };
}
