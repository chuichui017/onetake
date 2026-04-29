'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { useStudio, type VideoCardShadow } from '@/lib/store';
import { setRecordingRef } from '@/lib/recordingRefs';

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
  const webcamShape = useStudio((s) => s.webcamShape);
  const videoMuted = useStudio((s) => s.videoMuted);
  const videoVolume = useStudio((s) => s.videoVolume);
  const videoPlaybackRate = useStudio((s) => s.videoPlaybackRate);
  const setVideoVolume = useStudio((s) => s.setVideoVolume);
  const setVideoPlaying = useStudio((s) => s.setVideoPlaying);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!videoUrl) return;
    // cardRef / videoRef live on a conditionally-rendered .video-card. They
    // attach only after ResizeObserver delivers a non-zero stage size, so
    // re-run when stageSize updates to capture the now-mounted refs.
    if (stageSize.w === 0 || stageSize.h === 0) return;
    setRecordingRef('videoCard', cardRef.current);
    setRecordingRef('uploadedVideo', videoRef.current);
    return () => {
      setRecordingRef('videoCard', null);
      setRecordingRef('uploadedVideo', null);
    };
  }, [videoUrl, videoRef, stageSize.w, stageSize.h]);

  if (!videoUrl) return null;

  // 0.58/0.42 mirrors WebcamLayer split rects so video fills the half opposite the webcam
  const isSplitBottom = webcamShape === 'split-bottom';
  const isSplitTop = webcamShape === 'split-top';
  const isSplit = isSplitBottom || isSplitTop;

  let cardW = 0;
  let cardH = 0;
  let splitLeft = 0;
  let splitTop = 0;
  if (stageSize.w > 0 && stageSize.h > 0 && aspectRatio > 0) {
    const availW = stageSize.w;
    const availH = isSplit ? stageSize.h * 0.58 : stageSize.h;
    const availAspect = availW / availH;
    if (aspectRatio > availAspect) {
      cardW = availW;
      cardH = availW / aspectRatio;
    } else {
      cardH = availH;
      cardW = availH * aspectRatio;
    }
    if (isSplit) {
      splitLeft = (stageSize.w - cardW) / 2;
      splitTop =
        (isSplitBottom ? 0 : stageSize.h * 0.42) + (availH - cardH) / 2;
    }
  }

  const positionStyle: CSSProperties = isSplit
    ? {
        left: `${splitLeft}px`,
        top: `${splitTop}px`,
        transform: `scale(${videoCard.scale})`,
        transformOrigin: 'center center',
      }
    : {
        left: `${videoCard.x}%`,
        top: `${videoCard.y}%`,
        transform: `translate(-50%, -50%) scale(${videoCard.scale})`,
        transformOrigin: 'center center',
      };

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      {cardW > 0 && (
        <div
          ref={cardRef}
          className="video-card"
          style={{
            position: 'absolute',
            width: `${cardW}px`,
            height: `${cardH}px`,
            borderRadius: `${videoCard.borderRadius}px`,
            boxShadow: SHADOW_MAP[videoCard.shadow],
            overflow: 'hidden',
            cursor: 'move',
            zIndex: 10,
            ...positionStyle,
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
