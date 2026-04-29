'use client';

import dynamic from 'next/dynamic';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  useStudio,
  type BackgroundState,
  type CanvasSize,
} from '@/lib/store';
import { getSmartShadow, hexToRgba } from '@/lib/utils';
import { setRecordingRef } from '@/lib/recordingRefs';
import { WebcamLayer } from './WebcamLayer';
import { ScreenStage } from './ScreenStage';
import { VideoStage } from './VideoStage';
import { RecordFrame } from './RecordFrame';
import { CanvasHint } from './CanvasHint';

const TldrawCanvas = dynamic(() => import('./TldrawCanvas'), { ssr: false });

const ASPECT: Record<CanvasSize, { w: number; h: number }> = {
  '16:9': { w: 16, h: 9 },
  '9:16': { w: 9, h: 16 },
  '16:10': { w: 16, h: 10 },
  '3:4': { w: 3, h: 4 },
  '1:1': { w: 1, h: 1 },
};

function bgToStyle(bg: BackgroundState): CSSProperties {
  if (bg.type === 'default') return { background: 'var(--bg)' };
  if (bg.type === 'solid') return { background: bg.value };
  if (bg.type === 'gradient') return { background: bg.value };
  if (bg.type === 'pattern') {
    const c = hexToRgba(bg.patternColor, bg.patternOpacity);
    let image = '';
    let size = 'auto';
    switch (bg.pattern) {
      case 'grid':
        image = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`;
        size = '24px 24px';
        break;
      case 'diagonal':
        image = `repeating-linear-gradient(45deg, transparent 0 8px, ${c} 8px 9px)`;
        break;
      case 'cross':
        image = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`;
        size = '32px 32px';
        break;
      case 'dots':
      default:
        image = `radial-gradient(circle, ${c} 1px, transparent 1px)`;
        size = '20px 20px';
        break;
    }
    return {
      backgroundColor: bg.patternBase,
      backgroundImage: image,
      backgroundSize: size,
    };
  }
  // blur — no real content backdrop available here, fall back to base color
  return { background: bg.patternBase ?? '#FAFAFA' };
}

function fitRect(
  parentW: number,
  parentH: number,
  aw: number,
  ah: number,
  pad = 32
) {
  const availW = Math.max(0, parentW - pad * 2);
  const availH = Math.max(0, parentH - pad * 2);
  const targetRatio = aw / ah;
  let w = availW;
  let h = w / targetRatio;
  if (h > availH) {
    h = availH;
    w = h * targetRatio;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

interface StageProps {
  onRequestScreen: () => void | Promise<void>;
}

export function Stage({ onRequestScreen }: StageProps) {
  const canvasSize = useStudio((s) => s.canvasSize);
  const bgSource = useStudio((s) => s.bgSource);
  const videoUrl = useStudio((s) => s.videoUrl);
  const canvasZoom = useStudio((s) => s.canvasZoom);
  const canvasPan = useStudio((s) => s.canvasPan);
  const background = useStudio((s) => s.background);
  const stageColor = useStudio((s) => s.stageColor);
  const setVideoFile = useStudio((s) => s.setVideoFile);
  const showToast = useStudio((s) => s.showToast);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [outer, setOuter] = useState({ w: 0, h: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setOuter({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const asp = ASPECT[canvasSize];
  const baseFit = useMemo(
    () => fitRect(outer.w, outer.h, asp.w, asp.h),
    [outer, asp]
  );

  useEffect(() => {
    if (baseFit.w === 0) return;
    setRecordingRef('stageShell', shellRef.current);
    return () => setRecordingRef('stageShell', null);
  }, [baseFit.w]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Trackpad pinch arrives as wheel with ctrlKey=true (synthesized by
      // the browser). Cmd+wheel on a mouse arrives with metaKey=true. Both
      // map to zoom; everything else pans.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const clamped = Math.max(-50, Math.min(50, e.deltaY));
        const factor = Math.exp(-clamped * 0.01);
        useStudio.getState().zoomAt(factor, cx, cy);
        return;
      }
      const shell = shellRef.current;
      if (shell && shell.contains(e.target as Node)) return;
      e.preventDefault();
      const { canvasPan: p, setCanvasPan } = useStudio.getState();
      setCanvasPan({ x: p.x - e.deltaX, y: p.y - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const transform = `translate(-50%, -50%) translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`;

  const isDefaultBg = background.type === 'default';
  const shellBaseStyle: CSSProperties = {
    width: baseFit.w,
    height: baseFit.h,
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform,
    transformOrigin: 'center center',
    borderRadius: '20px',
    boxShadow: getSmartShadow(background),
    transition: 'background 0.2s ease, box-shadow 0.3s ease',
  };
  const shellStyle: CSSProperties = {
    ...shellBaseStyle,
    ...(isDefaultBg ? { background: stageColor } : bgToStyle(background)),
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const file = files.find((f) => f.type.startsWith('video/'));
    if (file) {
      setVideoFile(file);
    } else if (files.length > 0) {
      showToast('请拖入视频文件（mp4/mov/webm）');
    }
  };

  return (
    <>
      <div
        ref={wrapRef}
        className={`canvas-wrap${isDragOver ? ' drag-over' : ''}`}
        onDoubleClick={(e) => {
          const shell = shellRef.current;
          if (shell && shell.contains(e.target as Node)) return;
          useStudio.getState().resetCanvasView();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={
          canvasZoom !== 1 || canvasPan.x !== 0 || canvasPan.y !== 0
            ? `画板 ${Math.round(canvasZoom * 100)}% · 双击灰色区重置`
            : undefined
        }
      >
        {baseFit.w > 0 && (
          <>
            <div
              ref={shellRef}
              className={`stage-shell${isDefaultBg ? ' dot-grid' : ''}`}
              style={shellStyle}
            >
              <TldrawCanvas />
              {bgSource === 'screen' && (
                <ScreenStage stageW={baseFit.w} stageH={baseFit.h} />
              )}
              {bgSource === 'video' && (
                <VideoStage key={videoUrl ?? 'none'} videoRef={videoRef} />
              )}
              <WebcamLayer stageW={baseFit.w} stageH={baseFit.h} />
            </div>
            <CanvasHint
              onRequestScreen={onRequestScreen}
              stageW={baseFit.w}
              stageH={baseFit.h}
              transform={transform}
            />
            <RecordFrame
              baseW={baseFit.w}
              baseH={baseFit.h}
              wrapW={outer.w}
              wrapH={outer.h}
            />
          </>
        )}
      </div>
    </>
  );
}
