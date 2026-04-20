'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio, type WebcamShape, type Pos } from '@/lib/store';
import { useCamera } from '@/hooks/useCamera';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  opacity: number;
  allowDrag: boolean;
}

function computeRect(
  shape: WebcamShape,
  size: number,
  stageW: number,
  stageH: number
): Rect {
  const margin = 18;
  switch (shape) {
    case 'circle': {
      const d = size;
      return {
        left: stageW - d - margin,
        top: stageH - d - margin,
        width: d,
        height: d,
        radius: d / 2,
        opacity: 1,
        allowDrag: true,
      };
    }
    case 'square': {
      const d = size;
      return {
        left: stageW - d - margin,
        top: stageH - d - margin,
        width: d,
        height: d,
        radius: 14,
        opacity: 1,
        allowDrag: true,
      };
    }
    case 'rect-h': {
      const w = size * 1.7;
      const h = size * 0.77;
      return {
        left: (stageW - w) / 2,
        top: stageH - h - margin,
        width: w,
        height: h,
        radius: 14,
        opacity: 1,
        allowDrag: true,
      };
    }
    case 'rect-v': {
      const w = size * 0.77;
      const h = size * 1.4;
      return {
        left: stageW - w - margin,
        top: (stageH - h) / 2,
        width: w,
        height: h,
        radius: 14,
        opacity: 1,
        allowDrag: true,
      };
    }
    case 'split-top': {
      const h = stageH * 0.42;
      return {
        left: 0,
        top: 0,
        width: stageW,
        height: h,
        radius: 0,
        opacity: 1,
        allowDrag: false,
      };
    }
    case 'split-bottom': {
      const h = stageH * 0.42;
      return {
        left: 0,
        top: stageH - h,
        width: stageW,
        height: h,
        radius: 0,
        opacity: 1,
        allowDrag: false,
      };
    }
    case 'full':
      return {
        left: 0,
        top: 0,
        width: stageW,
        height: stageH,
        radius: 0,
        opacity: 1,
        allowDrag: false,
      };
    case 'hidden':
    default:
      return {
        left: stageW - size - margin,
        top: stageH - size - margin,
        width: size,
        height: size,
        radius: size / 2,
        opacity: 0,
        allowDrag: false,
      };
  }
}

const SNAP = 10;

export function WebcamLayer({
  stageW,
  stageH,
}: {
  stageW: number;
  stageH: number;
}) {
  const shape = useStudio((s) => s.webcamShape);
  const size = useStudio((s) => s.webcamSize);
  const customPos = useStudio((s) => s.customWebcamPos);
  const border = useStudio((s) => s.border);
  const setCustomWebcamPos = useStudio((s) => s.setCustomWebcamPos);
  const startCameraPreview = useStudio((s) => s.startCameraPreview);

  const { stream, videoRef } = useCamera();

  const base = useMemo(
    () => computeRect(shape, size, stageW, stageH),
    [shape, size, stageW, stageH]
  );

  const [drag, setDrag] = useState<null | {
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
  }>(null);
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({});
  const layerRef = useRef<HTMLDivElement | null>(null);

  const rect = useMemo(() => {
    if (base.allowDrag && customPos) {
      return {
        ...base,
        left: customPos.left,
        top: customPos.top,
      };
    }
    return base;
  }, [base, customPos]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      let nextLeft = drag.origLeft + (e.clientX - drag.startX);
      let nextTop = drag.origTop + (e.clientY - drag.startY);

      const gv: { v?: number; h?: number } = {};
      const centerX = stageW / 2 - rect.width / 2;
      const centerY = stageH / 2 - rect.height / 2;
      const rightEdge = stageW - rect.width - 8;
      const bottomEdge = stageH - rect.height - 8;

      if (Math.abs(nextLeft - centerX) < SNAP) {
        nextLeft = centerX;
        gv.v = stageW / 2;
      }
      if (Math.abs(nextLeft - 8) < SNAP) {
        nextLeft = 8;
      }
      if (Math.abs(nextLeft - rightEdge) < SNAP) {
        nextLeft = rightEdge;
      }
      if (Math.abs(nextTop - centerY) < SNAP) {
        nextTop = centerY;
        gv.h = stageH / 2;
      }
      if (Math.abs(nextTop - 8) < SNAP) {
        nextTop = 8;
      }
      if (Math.abs(nextTop - bottomEdge) < SNAP) {
        nextTop = bottomEdge;
      }

      nextLeft = Math.max(0, Math.min(stageW - rect.width, nextLeft));
      nextTop = Math.max(0, Math.min(stageH - rect.height, nextTop));

      setGuides(gv);
      setCustomWebcamPos({ left: nextLeft, top: nextTop });
    };
    const onUp = () => {
      setDrag(null);
      setGuides({});
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, rect.width, rect.height, stageW, stageH, setCustomWebcamPos]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!base.allowDrag) return;
    const current: Pos = customPos ?? { left: base.left, top: base.top };
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      origLeft: current.left,
      origTop: current.top,
    });
  };

  const ready = stream !== null;
  const cls =
    'webcam-layer' +
    (drag ? ' dragging' : '') +
    (!ready && shape !== 'hidden' ? ' no-perm' : '');

  const boxShadow =
    border.enabled && shape !== 'full'
      ? `0 0 0 3px ${border.color}, 0 8px 32px rgba(0, 0, 0, 0.18)`
      : undefined;

  return (
    <>
      {guides.v !== undefined && (
        <div className="snap-guide v" style={{ left: guides.v }} />
      )}
      {guides.h !== undefined && (
        <div className="snap-guide h" style={{ top: guides.h }} />
      )}
      <div
        ref={layerRef}
        className={cls}
        onPointerDown={onPointerDown}
        style={
          {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            borderRadius: rect.radius,
            opacity: rect.opacity,
            pointerEvents: shape === 'hidden' ? 'none' : 'auto',
            zIndex: shape === 'full' ? 5 : 20,
            boxShadow,
          } as React.CSSProperties
        }
      >
        {ready ? (
          <video ref={videoRef} autoPlay playsInline muted />
        ) : (
          shape !== 'hidden' && (
            <>
              <span style={{ opacity: 0.8 }}>摄像头未开启</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void startCameraPreview();
                }}
              >
                开启摄像头
              </button>
            </>
          )
        )}
      </div>
    </>
  );
}
