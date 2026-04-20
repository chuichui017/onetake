'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStudio } from '@/lib/store';

export type ScreenStatus = 'idle' | 'active' | 'error';

let sharedScreen: MediaStream | null = null;
const subscribers = new Set<(s: MediaStream | null) => void>();

function notify() {
  subscribers.forEach((fn) => fn(sharedScreen));
}

export function useScreenShare() {
  const [status, setStatus] = useState<ScreenStatus>(
    sharedScreen ? 'active' : 'idle'
  );
  const [stream, setStream] = useState<MediaStream | null>(sharedScreen);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setBgSource = useStudio((s) => s.setBgSource);

  useEffect(() => {
    const fn = (s: MediaStream | null) => {
      setStream(s);
      setStatus(s ? 'active' : 'idle');
    };
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
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      sharedScreen = s;
      s.getVideoTracks()[0]?.addEventListener('ended', () => {
        sharedScreen = null;
        notify();
        setBgSource('board');
      });
      notify();
      setBgSource('screen');
    } catch (err) {
      setStatus('error');
      setBgSource('board');
      throw err;
    }
  }, [setBgSource]);

  const stop = useCallback(() => {
    if (sharedScreen) {
      sharedScreen.getTracks().forEach((t) => t.stop());
      sharedScreen = null;
      notify();
    }
  }, []);

  return { status, stream, videoRef, request, stop };
}
