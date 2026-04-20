'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Pause, Play } from 'lucide-react';
import { useStudio, type VideoFit } from '@/lib/store';

interface VideoStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

const OBJECT_FIT: Record<VideoFit, 'cover' | 'contain' | 'fill' | 'none'> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'fill',
  center: 'none',
};

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const NO_DRAG_STYLE: CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  MozUserSelect: 'none',
  ...({
    WebkitUserDrag: 'none',
    userDrag: 'none',
  } as CSSProperties),
};

export function VideoStage({ videoRef }: VideoStageProps) {
  const videoUrl = useStudio((s) => s.videoUrl);
  const isPlaying = useStudio((s) => s.videoPlaying);
  const setVideoPlaying = useStudio((s) => s.setVideoPlaying);
  const transform = useStudio((s) => s.videoTransform);
  const setVideoTransform = useStudio((s) => s.setVideoTransform);
  const videoMuted = useStudio((s) => s.videoMuted);
  const videoVolume = useStudio((s) => s.videoVolume);
  const videoPlaybackRate = useStudio((s) => s.videoPlaybackRate);
  const setVideoVolume = useStudio((s) => s.setVideoVolume);
  const [error, setError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [outerSize, setOuterSize] = useState({ w: 0, h: 0 });
  const outerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = videoMuted;
    v.volume = videoVolume;
    v.playbackRate = videoPlaybackRate;
  }, [videoMuted, videoVolume, videoPlaybackRate, videoRef, videoUrl]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setOuterSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Native wheel handler with passive:false so we can preventDefault and
  // stopPropagation before the canvas-wrap pan/zoom listener fires.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const cur = useStudio.getState().videoTransform.scale;
      const factor = Math.exp(-e.deltaY * 0.005);
      const next = Math.max(0.2, Math.min(5, cur * factor));
      useStudio.getState().setVideoTransform({ scale: next });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (!videoUrl) return null;

  const fit = transform.fit;
  const layerTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  const beginInteraction = () => {
    outerRef.current?.classList.add('dragging');
  };
  const endInteraction = () => {
    outerRef.current?.classList.remove('dragging');
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains('video-dot') ||
      target.classList.contains('video-play-btn') ||
      target.closest('.video-play-btn')
    ) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = transform.x;
    const origY = transform.y;

    beginInteraction();

    let rafId: number | null = null;
    let pendingX = origX;
    let pendingY = origY;

    const flush = () => {
      setVideoTransform({ x: pendingX, y: pendingY });
      rafId = null;
    };

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      pendingX = origX + (ev.clientX - startX);
      pendingY = origY + (ev.clientY - startY);
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    const onUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      flush();
      endInteraction();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cleanupRef.current = null;
    };

    cleanupRef.current = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      endInteraction();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  const startResize = (e: React.PointerEvent, corner: Corner) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const origScale = transform.scale;

    beginInteraction();

    let rafId: number | null = null;
    let pendingScale = origScale;

    const flush = () => {
      setVideoTransform({ scale: pendingScale });
      rafId = null;
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let delta = 0;
      if (corner === 'br') delta = (dx + dy) / 2;
      else if (corner === 'tl') delta = -(dx + dy) / 2;
      else if (corner === 'tr') delta = (dx - dy) / 2;
      else if (corner === 'bl') delta = (-dx + dy) / 2;
      pendingScale = Math.max(0.2, Math.min(5, origScale + delta / 250));
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    const onUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      flush();
      endInteraction();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cleanupRef.current = null;
    };

    cleanupRef.current = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      endInteraction();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  const preventDrag = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Position overlays (play button + corner dots) in the unscaled outer so
  // they keep a constant visual size regardless of video scale.
  const halfW = (outerSize.w * transform.scale) / 2;
  const halfH = (outerSize.h * transform.scale) / 2;
  const cx = outerSize.w / 2 + transform.x;
  const cy = outerSize.h / 2 + transform.y;

  return (
    <div
      ref={outerRef}
      className="video-stage video-stage-outer"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        overflow: 'visible',
        touchAction: 'none',
        ...NO_DRAG_STYLE,
      }}
      onDragStart={preventDrag}
    >
      <div
        className="video-layer"
        draggable={false}
        style={{
          transform: layerTransform,
          transformOrigin: 'center center',
          touchAction: 'none',
          ...NO_DRAG_STYLE,
        }}
        onPointerDown={startDrag}
        onDragStart={preventDrag}
      >
        {error ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FAFAFA',
              color: '#52525B',
              fontSize: 14,
            }}
          >
            视频加载失败
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted={videoMuted}
            draggable={false}
            onDragStart={preventDrag}
            onContextMenu={(e) => e.preventDefault()}
            onVolumeChange={(e) => {
              const next = e.currentTarget.volume;
              if (Math.abs(next - videoVolume) > 0.005) setVideoVolume(next);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: OBJECT_FIT[fit],
              background: '#FAFAFA',
              display: 'block',
              opacity: videoReady ? 1 : 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
              imageRendering: 'auto',
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              ...NO_DRAG_STYLE,
            }}
            onLoadedData={() => setVideoReady(true)}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onEnded={() => setVideoPlaying(false)}
            onError={() => setError(true)}
          />
        )}
      </div>

      {outerSize.w > 0 && (
        <>
          <button
            type="button"
            className="video-play-btn"
            style={{ left: cx, top: cy }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause size={22} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={22} fill="currentColor" strokeWidth={0} />
            )}
          </button>

          <div
            className="video-dot tl"
            style={{ left: cx - halfW, top: cy - halfH }}
            onPointerDown={(e) => startResize(e, 'tl')}
          />
          <div
            className="video-dot tr"
            style={{ left: cx + halfW, top: cy - halfH }}
            onPointerDown={(e) => startResize(e, 'tr')}
          />
          <div
            className="video-dot bl"
            style={{ left: cx - halfW, top: cy + halfH }}
            onPointerDown={(e) => startResize(e, 'bl')}
          />
          <div
            className="video-dot br"
            style={{ left: cx + halfW, top: cy + halfH }}
            onPointerDown={(e) => startResize(e, 'br')}
          />
        </>
      )}
    </div>
  );
}
