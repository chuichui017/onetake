'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useStudio, type VideoCardShadow } from '@/lib/store';

interface VideoStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

const SHADOW_MAP: Record<VideoCardShadow, string> = {
  none: 'none',
  small: '0 4px 12px rgba(0,0,0,0.1)',
  medium: '0 12px 32px rgba(0,0,0,0.15)',
  large: '0 24px 64px rgba(0,0,0,0.25)',
};

export function VideoStage({ videoRef }: VideoStageProps) {
  const videoUrl = useStudio((s) => s.videoUrl);
  const videoCard = useStudio((s) => s.videoCard);
  const videoMuted = useStudio((s) => s.videoMuted);
  const videoVolume = useStudio((s) => s.videoVolume);
  const videoPlaybackRate = useStudio((s) => s.videoPlaybackRate);
  const setVideoVolume = useStudio((s) => s.setVideoVolume);
  const setVideoPlaying = useStudio((s) => s.setVideoPlaying);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = videoMuted;
    v.volume = videoVolume;
    v.playbackRate = videoPlaybackRate;
  }, [videoMuted, videoVolume, videoPlaybackRate, videoRef, videoUrl]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setStageSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!videoUrl) return null;

  // contain-fit base size to stage, then × videoCard.scale via CSS transform
  let cardW = 0;
  let cardH = 0;
  if (stageSize.w > 0 && stageSize.h > 0 && aspectRatio > 0) {
    const stageAspect = stageSize.w / stageSize.h;
    if (aspectRatio > stageAspect) {
      cardW = stageSize.w;
      cardH = stageSize.w / aspectRatio;
    } else {
      cardH = stageSize.h;
      cardW = stageSize.h * aspectRatio;
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      {cardW > 0 && (
        <div
          className="video-card"
          style={{
            position: 'absolute',
            left: `${videoCard.x}%`,
            top: `${videoCard.y}%`,
            width: `${cardW}px`,
            height: `${cardH}px`,
            transform: `translate(-50%, -50%) scale(${videoCard.scale})`,
            transformOrigin: 'center center',
            borderRadius: `${videoCard.borderRadius}px`,
            boxShadow: SHADOW_MAP[videoCard.shadow],
            overflow: 'hidden',
            cursor: 'move',
            zIndex: 10,
          }}
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
              className="uploaded-video"
              src={videoUrl}
              autoPlay
              loop
              playsInline
              muted={videoMuted}
              controls={false}
              disablePictureInPicture
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) {
                  setAspectRatio(v.videoWidth / v.videoHeight);
                }
              }}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => setVideoPlaying(false)}
              onVolumeChange={(e) => {
                const next = e.currentTarget.volume;
                if (Math.abs(next - videoVolume) > 0.005) setVideoVolume(next);
              }}
              onError={() => setError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                imageRendering: '-webkit-optimize-contrast',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
