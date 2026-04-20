'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';

let sharedStream: MediaStream | null = null;
const subscribers = new Set<(s: MediaStream | null) => void>();

function notify() {
  subscribers.forEach((fn) => fn(sharedStream));
}

async function acquire(): Promise<MediaStream> {
  if (sharedStream) return sharedStream;
  const s = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: true,
  });
  sharedStream = s;
  notify();
  return s;
}

function release(): void {
  if (!sharedStream) return;
  sharedStream.getTracks().forEach((t) => t.stop());
  sharedStream = null;
  notify();
}

export async function startCamera(): Promise<MediaStream> {
  return acquire();
}

export function stopCamera(): void {
  release();
}

export function getCameraStream(): MediaStream | null {
  return sharedStream;
}

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(sharedStream);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fn = (s: MediaStream | null) => setStream(s);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const request = useCallback(async () => {
    setStatus('requesting');
    setError(null);
    try {
      await acquire();
      setStatus('ready');
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === 'NotAllowedError') setStatus('denied');
      else {
        setStatus('error');
        setError(err?.message ?? 'Camera error');
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (sharedStream) {
      sharedStream.getTracks().forEach((t) => t.stop());
      sharedStream = null;
      notify();
    }
    setStatus('idle');
  }, []);

  return { status, error, stream, videoRef, request, stop };
}
