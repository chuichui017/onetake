'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStudio } from '@/lib/store';

type DocPiP = {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
};

type WinWithPiP = Window & {
  documentPictureInPicture?: DocPiP;
};

export function useFloatingStudio(cameraStream: MediaStream | null) {
  const [active, setActive] = useState(false);
  const pipWinRef = useRef<Window | null>(null);
  const pipTextRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const telePlaying = useStudio((s) => s.telePlaying);
  const teleSpeed = useStudio((s) => s.teleSpeed);
  const teleText = useStudio((s) => s.teleText);

  const close = useCallback(() => {
    if (pipWinRef.current) {
      pipWinRef.current.close();
      pipWinRef.current = null;
    }
    setActive(false);
  }, []);

  const open = useCallback(async () => {
    const w = window as WinWithPiP;
    if (!w.documentPictureInPicture) {
      const vids = document.querySelectorAll('video');
      const first = vids[0];
      if (first && 'requestPictureInPicture' in first) {
        try {
          await first.requestPictureInPicture();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (pipWinRef.current) return;
    const pip = await w.documentPictureInPicture.requestWindow({
      width: 420,
      height: 380,
    });
    pipWinRef.current = pip;
    setActive(true);

    pip.document.head.innerHTML = `
      <style>
        body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif; background:#0B0B0D; color:#FAFAFA; overflow:hidden; height:100vh; display:flex; flex-direction:column; }
        .wrap { flex:1; display:flex; flex-direction:column; }
        .cam { width:100%; height:260px; background:#000; overflow:hidden; position:relative; }
        .cam video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); display:block; }
        .tele { flex:1; background:rgba(12,12,14,0.92); overflow:hidden; position:relative; padding:10px 14px; }
        .tele .label { font-family:'SF Mono',Menlo,monospace; font-size:10px; letter-spacing:0.08em; color:#8B85FF; margin-bottom:6px; }
        .tele .text { font-size:15px; line-height:1.5; white-space:pre-wrap; will-change:transform; }
        .dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#8B85FF; margin-right:6px; vertical-align:middle; animation:p 1.4s ease-in-out infinite; }
        @keyframes p { 0%,100%{opacity:1} 50%{opacity:0.4} }
      </style>
    `;
    pip.document.body.innerHTML = `
      <div class="wrap">
        <div class="cam"><video id="cam" autoplay playsinline muted></video></div>
        <div class="tele">
          <div class="label"><span class="dot"></span>提词器 · 实时同步</div>
          <div class="text" id="txt"></div>
        </div>
      </div>
    `;

    const camEl = pip.document.getElementById('cam') as HTMLVideoElement | null;
    if (camEl && cameraStream) camEl.srcObject = cameraStream;

    const textEl = pip.document.getElementById('txt') as HTMLDivElement | null;
    pipTextRef.current = textEl;
    if (textEl) textEl.textContent = teleText;

    pip.addEventListener('pagehide', () => {
      pipWinRef.current = null;
      pipTextRef.current = null;
      setActive(false);
    });
  }, [cameraStream, teleText]);

  useEffect(() => {
    if (!active) return;
    if (pipTextRef.current) pipTextRef.current.textContent = teleText;
  }, [teleText, active]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (telePlaying && pipTextRef.current) {
        offsetRef.current += (dt / 1000) * 32 * teleSpeed;
        pipTextRef.current.style.transform = `translateY(${-offsetRef.current}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, telePlaying, teleSpeed]);

  return { active, open, close };
}
