'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Pause,
  Play,
  Scissors,
  Settings2,
  Type,
} from 'lucide-react';
import { useStudio, type CanvasSize } from '@/lib/store';
import { sceneOrder, scenes, type SceneId } from '@/lib/scenes';

interface HeaderProps {
  onRequestScreen: () => void | Promise<void>;
}

const RATIOS: CanvasSize[] = ['16:9', '9:16', '1:1', '3:4', '16:10'];

function RecordSettings() {
  const canvasSize = useStudio((s) => s.canvasSize);
  const setCanvasSize = useStudio((s) => s.setCanvasSize);
  const recordWithBackground = useStudio((s) => s.recordWithBackground);
  const setRecordWithBackground = useStudio((s) => s.setRecordWithBackground);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (wrap && !wrap.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="record-settings" ref={wrapRef}>
      <button
        type="button"
        className={`header-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="录制设置"
      >
        <Settings2 size={14} />
        <span>录制设置</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="record-settings-menu" role="menu">
          <div className="record-settings-group">
            <div className="record-settings-label">画布比例</div>
            <div className="record-settings-segmented">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`record-settings-segment${
                    r === canvasSize ? ' active' : ''
                  }`}
                  onClick={() => setCanvasSize(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="record-settings-divider" />

          <div className="record-settings-group">
            <div className="record-settings-label">录制内容</div>
            <div className="record-settings-row">
              <button
                type="button"
                className={`record-settings-pill${
                  recordWithBackground ? ' active' : ''
                }`}
                onClick={() => setRecordWithBackground(true)}
                aria-pressed={recordWithBackground}
              >
                <ImageIcon size={13} />
                <span>带背景</span>
              </button>
              <button
                type="button"
                className={`record-settings-pill${
                  !recordWithBackground ? ' active' : ''
                }`}
                onClick={() => setRecordWithBackground(false)}
                aria-pressed={!recordWithBackground}
              >
                <Scissors size={13} />
                <span>纯视频</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SceneSwitcherProps {
  onRequestScreen: () => void | Promise<void>;
}

function SceneSwitcher({ onRequestScreen }: SceneSwitcherProps) {
  const scene = useStudio((s) => s.scene);
  const setScene = useStudio((s) => s.setScene);

  const pick = (id: SceneId) => {
    setScene(id);
    if (scenes[id].autoShare) {
      void onRequestScreen();
    }
  };

  return (
    <div className="scene-switcher" role="tablist">
      {sceneOrder.map((id) => {
        const s = scenes[id];
        const active = scene === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`scene-switcher-btn${active ? ' active' : ''}`}
            onClick={() => pick(id)}
            title={s.description}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function HeaderVideoControls() {
  const bgSource = useStudio((s) => s.bgSource);
  const videoUrl = useStudio((s) => s.videoUrl);
  const videoPlaying = useStudio((s) => s.videoPlaying);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (bgSource !== 'video' || !videoUrl) return;
    let v: HTMLVideoElement | null = null;
    let raf = 0;
    const find = () => {
      v = document.querySelector(
        'video.uploaded-video'
      ) as HTMLVideoElement | null;
      if (!v) {
        raf = window.requestAnimationFrame(find);
        return;
      }
      const onTime = () => setCurrentTime(v!.currentTime);
      const onMeta = () => setDuration(v!.duration || 0);
      v.addEventListener('timeupdate', onTime);
      v.addEventListener('loadedmetadata', onMeta);
      v.addEventListener('durationchange', onMeta);
      if (v.readyState >= 1) {
        setDuration(v.duration || 0);
        setCurrentTime(v.currentTime);
      }
      cleanup = () => {
        v?.removeEventListener('timeupdate', onTime);
        v?.removeEventListener('loadedmetadata', onMeta);
        v?.removeEventListener('durationchange', onMeta);
      };
    };
    let cleanup: (() => void) | null = null;
    find();
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [bgSource, videoUrl]);

  if (bgSource !== 'video' || !videoUrl) return null;

  const onToggle = () => {
    const v = document.querySelector(
      'video.uploaded-video'
    ) as HTMLVideoElement | null;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = document.querySelector(
      'video.uploaded-video'
    ) as HTMLVideoElement | null;
    if (!v) return;
    const next = Number(e.target.value);
    v.currentTime = next;
    setCurrentTime(next);
  };

  return (
    <div className="header-video-controls">
      <button
        type="button"
        className="header-video-play"
        onClick={onToggle}
        aria-label={videoPlaying ? '暂停' : '播放'}
      >
        {videoPlaying ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <input
        type="range"
        className="header-video-progress"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={onSeek}
        disabled={!duration}
      />
      <span className="header-video-time">{formatTime(currentTime)}</span>
    </div>
  );
}

export function Header({ onRequestScreen }: HeaderProps) {
  const isRecording = useStudio((s) => s.isRecording);
  const recordingDuration = useStudio((s) => s.recordingDuration);
  const teleprompterVisible = useStudio((s) => s.teleprompterVisible);
  const toggleTeleprompterVisible = useStudio(
    (s) => s.toggleTeleprompterVisible
  );
  const panelHidden = useStudio((s) => s.panelHidden);
  const togglePanelHidden = useStudio((s) => s.togglePanelHidden);
  const startRecordingAction = useStudio((s) => s.startRecordingAction);
  const stopRecordingAction = useStudio((s) => s.stopRecordingAction);

  return (
    <header
      className="app-header flex items-center justify-between px-4"
      style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '-0.03em',
          }}
        >
          O
        </div>
        <span
          style={{
            fontSize: 'var(--fs-md)',
            fontWeight: 600,
            letterSpacing: '-0.015em',
          }}
        >
          OneTake
        </span>
        <span
          className="sb-text-t"
          style={{
            marginLeft: 8,
            fontSize: 'var(--fs-xxs)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          v0.1
        </span>
        <SceneSwitcher onRequestScreen={onRequestScreen} />
      </div>

      <div className="flex items-center gap-1">
        <button
          className="header-hide-panel-btn"
          onClick={togglePanelHidden}
          title={panelHidden ? '展开面板' : '隐藏面板'}
          aria-label="toggle right panel"
        >
          {panelHidden ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        <HeaderVideoControls />
        <button
          id="toggleTeleprompter"
          className={`header-btn${teleprompterVisible ? ' active' : ''}`}
          onClick={toggleTeleprompterVisible}
          title="显示/隐藏 提词器"
          aria-label="toggle teleprompter"
        >
          <Type size={14} />
          <span>提词器</span>
        </button>
        <RecordSettings />
        <button
          className={`record-btn${isRecording ? ' recording' : ''}`}
          onClick={isRecording ? stopRecordingAction : startRecordingAction}
        >
          {isRecording ? (
            <>
              <span className="rec-dot-pulse" />
              <span className="rec-time-display">
                {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:
                {String(recordingDuration % 60).padStart(2, '0')}
              </span>
              <span>停止录制</span>
            </>
          ) : (
            <>
              <span className="record-dot" />
              <span>开始录制</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
