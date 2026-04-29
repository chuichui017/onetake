'use client';

import { useEffect, useRef, useState } from 'react';
import { useStudio, type VideoCardShadow } from '@/lib/store';
import { useScreenShare } from '@/hooks/useScreenShare';
import { setRecordingRef } from '@/lib/recordingRefs';

const SHADOW_MAP: Record<VideoCardShadow, string> = {
  none: 'none',
  small: '0 4px 12px rgba(0,0,0,0.1)',
  medium: '0 12px 32px rgba(0,0,0,0.15)',
  large: '0 24px 64px rgba(0,0,0,0.25)',
};

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
  const videoCard = useStudio((s) => s.videoCard);
  const webcamShape = useStudio((s) => s.webcamShape);
  const { stream, videoRef } = useScreenShare();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<PanState | null>(null);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  useEffect(() => {
    if (!stream) return;
    setRecordingRef('screenWrap', wrapRef.current);
    return () => setRecordingRef('screenWrap', null);
  }, [stream]);

  useEffect(() => {
    if (stream) {
      setScreenTransform({ x: 0, y: 0 });
    }
  }, [stream, setScreenTransform]);

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

  if (!stream) return null;

  const isSplit =
    webcamShape === 'split-top' || webcamShape === 'split-bottom';

  let cardLeft = 0;
  let cardTop = 0;
  let cardW = stageW;
  let cardH = stageH;

  if (isSplit) {
    const splitH = stageH * 0.58;
    cardW = stageW;
    cardH = splitH;
    cardLeft = 0;
    cardTop = webcamShape === 'split-top' ? stageH * 0.42 : 0;
  } else if (stageW > 0 && stageH > 0 && aspectRatio > 0) {
    const stageAspect = stageW / stageH;
    let baseW: number;
    let baseH: number;
    if (aspectRatio > stageAspect) {
      baseW = stageW;
      baseH = stageW / aspectRatio;
    } else {
      baseH = stageH;
      baseW = stageH * aspectRatio;
    }
    cardW = baseW * videoCard.scale;
    cardH = baseH * videoCard.scale;
    cardLeft = (stageW - cardW) / 2;
    cardTop = (stageH - cardH) / 2;
  }

  return (
    <div
      ref={wrapRef}
      className="screen-wrap"
      style={{
        left: cardLeft,
        top: cardTop,
        width: cardW,
        height: cardH,
        zIndex: 2,
        cursor: pan ? 'grabbing' : 'grab',
        borderRadius: isSplit ? 0 : `${videoCard.borderRadius}px`,
        boxShadow: isSplit ? 'none' : SHADOW_MAP[videoCard.shadow],
        isolation: 'isolate',
      }}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        disablePictureInPicture
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) {
            setAspectRatio(v.videoWidth / v.videoHeight);
          }
        }}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'center',
          objectFit: transform.fit,
        }}
      />
    </div>
  );
}
