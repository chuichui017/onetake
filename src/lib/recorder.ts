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
