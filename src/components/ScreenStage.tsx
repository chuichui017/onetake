'use client';

import { useEffect, useRef, useState } from 'react';
import { useStudio } from '@/lib/store';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useScreenLayout } from '@/hooks/useScreenLayout';

interface PanState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

export function ScreenStage({
  stageW,
  stageH,
}: {
  stageW: number;
  stageH: number;
}) {
  const transform = useStudio((s) => s.screenTransform);
  const setScreenTransform = useStudio((s) => s.setScreenTransform);
  const rect = useScreenLayout(stageW, stageH);
  const { stream, videoRef } = useScreenShare();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<PanState | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  useEffect(() => {
    if (!pan) return;
    const onMove = (e: PointerEvent) => {
      setScreenTransform({
        x: pan.origX + (e.clientX - pan.startX),
        y: pan.origY + (e.clientY - pan.startY),
      });
    };
    const onUp = () => setPan(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [pan, setScreenTransform]);

  const onPointerDown = (e: React.PointerEvent) => {
    setPan({
      startX: e.clientX,
      startY: e.clientY,
      origX: transform.x,
      origY: transform.y,
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const next = Math.max(0.3, Math.min(4, transform.scale + delta));
    setScreenTransform({ scale: next });
  };

  return (
    <div
      ref={wrapRef}
      className="screen-wrap"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 2,
        cursor: pan ? 'grabbing' : 'grab',
      }}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'center',
          objectFit: transform.fit,
        }}
      />
    </div>
  );
}
