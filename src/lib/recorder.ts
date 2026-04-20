export async function startRecording(
  webcamVideoEl: HTMLVideoElement | null,
  onAutoStop?: () => void
) {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 2560 },
      height: { ideal: 1440 },
      frameRate: { ideal: 30 },
    },
    audio: true,
  });

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
    console.warn('麦克风获取失败:', err);
  }

  const finalStream = new MediaStream([
    ...displayStream.getVideoTracks(),
    ...displayStream.getAudioTracks(),
    ...(micStream?.getAudioTracks() || []),
  ]);

  if (
    webcamVideoEl &&
    document.pictureInPictureEnabled &&
    webcamVideoEl.readyState >= 2
  ) {
    try {
      await webcamVideoEl.requestPictureInPicture();
    } catch (err) {
      console.warn('PiP 启动失败（不致命）:', err);
    }
  }

  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(finalStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let resolveStop: ((b: Blob) => void) | null = null;
  let rejectStop: ((err: unknown) => void) | null = null;
  const stoppedPromise = new Promise<Blob>((resolve, reject) => {
    resolveStop = resolve;
    rejectStop = reject;
  });

  recorder.onstop = async () => {
    displayStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {}
    }
    resolveStop?.(new Blob(chunks, { type: mimeType }));
  };
  recorder.onerror = (e) => rejectStop?.(e);

  displayStream.getVideoTracks()[0].addEventListener('ended', () => {
    if (recorder.state !== 'inactive') recorder.stop();
    onAutoStop?.();
  });

  const stop = (): Promise<Blob> => {
    if (recorder.state !== 'inactive') recorder.stop();
    return stoppedPromise;
  };

  recorder.start(1000);
  return { stop };
}

function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
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
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.webm`;
}

export function isRecordingSupported() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getDisplayMedia
  ) {
    return {
      supported: false,
      reason: '浏览器不支持录制，请使用 Chrome / Edge 最新版',
    };
  }
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, reason: '浏览器缺少录制 API' };
  }
  return { supported: true };
}
