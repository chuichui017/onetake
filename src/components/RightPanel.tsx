'use client';

import { useEffect, useRef } from 'react';
import {
  useStudio,
  type WebcamShape,
  type BeautyMode,
  type PanelKey,
  type VideoFit,
} from '@/lib/store';
import { BackgroundPicker } from './BackgroundPicker';
import { useScreenShare } from '@/hooks/useScreenShare';

const BORDER_PRESETS: { name: string; value: string }[] = [
  { name: '白', value: '#FFFFFF' },
  { name: '墨', value: '#18181B' },
  { name: '雾灰', value: '#D4D4D8' },
  { name: '米色', value: '#F5F0E8' },
  { name: '樱粉', value: '#FBCFE8' },
  { name: '靛蓝', value: '#818CF8' },
];

const SHAPES: { v: WebcamShape; label: string; icon: React.ReactNode }[] = [
  {
    v: 'circle',
    label: '圆形',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="7" />
      </svg>
    ),
  },
  {
    v: 'rect-h',
    label: '横向',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="9" width="18" height="6" rx="2" />
      </svg>
    ),
  },
  {
    v: 'rect-v',
    label: '竖向',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="9" y="3" width="6" height="18" rx="2" />
      </svg>
    ),
  },
  {
    v: 'square',
    label: '方形',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="5" y="5" width="14" height="14" rx="2" />
      </svg>
    ),
  },
  {
    v: 'full',
    label: '全屏',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="3"
          fill="currentColor"
          fillOpacity="0.3"
        />
      </svg>
    ),
  },
  {
    v: 'split-top',
    label: '上半屏',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect
          x="3"
          y="3"
          width="18"
          height="9"
          rx="2"
          fill="currentColor"
          fillOpacity="0.3"
        />
      </svg>
    ),
  },
  {
    v: 'split-bottom',
    label: '下半屏',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect
          x="3"
          y="12"
          width="18"
          height="9"
          rx="2"
          fill="currentColor"
          fillOpacity="0.3"
        />
      </svg>
    ),
  },
  {
    v: 'hidden',
    label: '隐藏',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ),
  },
];

const BEAUTY_MODES: BeautyMode[] = ['关闭', '自然', '明亮', '柔光'];

function SectionHeader({
  panelKey,
  label,
  collapsed,
}: {
  panelKey: PanelKey;
  label: string;
  collapsed: boolean;
}) {
  const togglePanelCollapse = useStudio((s) => s.togglePanelCollapse);
  return (
    <button
      type="button"
      className="panel-section-header"
      onClick={() => togglePanelCollapse(panelKey)}
      aria-expanded={!collapsed}
    >
      <span className="panel-label">{label}</span>
      <span
        className={`panel-toggle-arrow${collapsed ? ' collapsed' : ''}`}
        aria-hidden="true"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>
  );
}

export function RightPanel() {
  const webcamShape = useStudio((s) => s.webcamShape);
  const webcamSize = useStudio((s) => s.webcamSize);
  const border = useStudio((s) => s.border);
  const beauty = useStudio((s) => s.beauty);
  const panelCollapsed = useStudio((s) => s.panelCollapsed);

  const setWebcamShape = useStudio((s) => s.setWebcamShape);
  const setWebcamSize = useStudio((s) => s.setWebcamSize);
  const setBorder = useStudio((s) => s.setBorder);
  const setBeauty = useStudio((s) => s.setBeauty);

  return (
    <aside className="right-panel">
      <div className="right-panel-scroll">
        <div className="panel-section persona-panel">
          <SectionHeader
            panelKey="persona"
            label="人像形状"
            collapsed={panelCollapsed.persona}
          />
          {!panelCollapsed.persona && (
            <div className="panel-section-body">
              <div className="shape-grid grid-4">
                {SHAPES.map(({ v, label, icon }) => (
                  <button
                    key={v}
                    type="button"
                    className={`card-btn icon-only ${webcamShape === v ? 'active' : ''}`}
                    onClick={() => setWebcamShape(v)}
                    title={label}
                    aria-label={label}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <div className="sub-section">
                <div className="sub-label-row">
                  <span className="sub-label">大小</span>
                  <span className="slider-value">
                    {Math.round(webcamSize)}px
                  </span>
                </div>
                <div className="slider-row">
                  <input
                    type="range"
                    min={100}
                    max={420}
                    step={2}
                    value={webcamSize}
                    onChange={(e) => setWebcamSize(Number(e.target.value))}
                    className="value-slider"
                  />
                </div>
              </div>

              <div className="sub-section">
                <div className="sub-label">边框</div>
                <div className="grid-2">
                  <button
                    type="button"
                    className={`card-btn sm ${!border.enabled ? 'active' : ''}`}
                    onClick={() => setBorder({ enabled: false })}
                  >
                    无边框
                  </button>
                  <button
                    type="button"
                    className={`card-btn sm ${border.enabled ? 'active' : ''}`}
                    onClick={() => setBorder({ enabled: true })}
                  >
                    带描边
                  </button>
                </div>

                {border.enabled && (
                  <div className="border-color-block">
                    <div className="swatch-row-with-label">
                      <span className="swatch-row-label">颜色</span>
                      <div className="swatch-row">
                        {BORDER_PRESETS.map((c) => (
                          <button
                            key={c.value}
                            className={`swatch${
                              border.color === c.value ? ' swatch-active' : ''
                            }`}
                            style={{ background: c.value }}
                            onClick={() => setBorder({ color: c.value })}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="custom-picker">
                      <input
                        type="color"
                        value={border.color}
                        onChange={(e) => setBorder({ color: e.target.value })}
                        className="picker-dot"
                      />
                      <input
                        type="text"
                        value={border.color.toUpperCase()}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{6}$/.test(v))
                            setBorder({ color: v });
                        }}
                        className="hex-field"
                        maxLength={7}
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="sub-section">
                <div className="sub-label">美颜</div>
                <div className="grid-4">
                  {BEAUTY_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`card-btn sm ${beauty === mode ? 'active' : ''}`}
                      onClick={() => setBeauty(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <BackgroundSection />

        <VideoCardSection />
        <VideoSpeedSection />
        <VideoFitSection />
        <VideoReselectSection />

        <ScreenSharePanel />
        <ScreenFitSection />
        <ScreenReselectSection />
      </div>

      <div className="right-panel-footer">
        <span>OneTake · 录的时候就是成片</span>
      </div>
    </aside>
  );
}

const SPEED_OPTIONS: number[] = [0.5, 1, 1.25, 1.5, 2];

const FIT_OPTIONS: { value: VideoFit; label: string }[] = [
  { value: 'contain', label: '适应' },
  { value: 'cover', label: '铺满' },
  { value: 'fill', label: '填满' },
  { value: 'center', label: '原尺寸' },
];

const SHADOW_PRESETS: { v: 'none' | 'small' | 'medium' | 'large'; label: string }[] = [
  { v: 'none', label: '无' },
  { v: 'small', label: '小' },
  { v: 'medium', label: '中' },
  { v: 'large', label: '大' },
];

function CardShapeControls() {
  const videoCard = useStudio((s) => s.videoCard);
  const setVideoCard = useStudio((s) => s.setVideoCard);

  return (
    <>
      <div className="panel-row">
        <label>圆角</label>
        <input
          type="range"
          min={0}
          max={48}
          value={videoCard.borderRadius}
          onChange={(e) =>
            setVideoCard({ borderRadius: Number(e.target.value) })
          }
        />
        <span>{videoCard.borderRadius}px</span>
      </div>
      <div className="panel-row">
        <label>投影</label>
        <div className="shadow-options">
          {SHADOW_PRESETS.map((s) => (
            <button
              key={s.v}
              type="button"
              className={`shadow-btn${
                videoCard.shadow === s.v ? ' active' : ''
              }`}
              onClick={() => setVideoCard({ shadow: s.v })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ScreenSharePanel() {
  const bgSource = useStudio((s) => s.bgSource);
  const videoCard = useStudio((s) => s.videoCard);
  const setVideoCard = useStudio((s) => s.setVideoCard);
  const resetScreenTransform = useStudio((s) => s.resetScreenTransform);
  const { stream } = useScreenShare();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (stream && sectionRef.current) {
      sectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [stream]);

  if (bgSource !== 'screen') return null;

  const pct = Math.round(videoCard.scale * 100);

  return (
    <div ref={sectionRef} className="panel-section screen-share-panel">
      <h3 className="panel-section-title">屏幕共享</h3>
      <div className="panel-section-body">
        <div className="panel-row">
          <label>大小</label>
          <input
            type="range"
            min={30}
            max={150}
            value={pct}
            onChange={(e) =>
              setVideoCard({ scale: Number(e.target.value) / 100 })
            }
          />
          <span>{pct}%</span>
        </div>
        <CardShapeControls />
        <button
          type="button"
          className="card-btn sm full-width reset-screen-btn"
          onClick={() => {
            setVideoCard({ scale: 1 });
            resetScreenTransform();
          }}
          title="重置缩放与位置"
        >
          重置
        </button>
      </div>
    </div>
  );
}

function VideoCardSection() {
  const videoUrl = useStudio((s) => s.videoUrl);
  const videoCard = useStudio((s) => s.videoCard);
  const setVideoCard = useStudio((s) => s.setVideoCard);
  const resetVideoCard = useStudio((s) => s.resetVideoCard);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (videoUrl && sectionRef.current) {
      sectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [videoUrl]);

  if (!videoUrl) return null;

  return (
    <div ref={sectionRef} className="panel-section video-card-panel">
      <h3 className="panel-section-title">视频卡片</h3>
      <div className="panel-section-body">
        <div className="panel-row">
          <label>大小</label>
          <input
            type="range"
            min={30}
            max={150}
            value={Math.round(videoCard.scale * 100)}
            onChange={(e) =>
              setVideoCard({ scale: Number(e.target.value) / 100 })
            }
          />
          <span>{Math.round(videoCard.scale * 100)}%</span>
        </div>
        <CardShapeControls />
        <button
          type="button"
          className="card-btn sm full-width"
          onClick={resetVideoCard}
          title="重置视频卡片"
        >
          重置
        </button>
      </div>
    </div>
  );
}

function VideoSpeedSection() {
  const videoUrl = useStudio((s) => s.videoUrl);
  const videoPlaybackRate = useStudio((s) => s.videoPlaybackRate);
  const setVideoPlaybackRate = useStudio((s) => s.setVideoPlaybackRate);

  if (!videoUrl) return null;

  return (
    <div className="panel-section">
      <h3 className="panel-section-title">播放速度</h3>
      <div className="panel-section-body">
        <div className="grid-5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`card-btn sm mono ${
                videoPlaybackRate === s ? 'active' : ''
              }`}
              onClick={() => setVideoPlaybackRate(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoFitSection() {
  const videoUrl = useStudio((s) => s.videoUrl);
  const videoTransform = useStudio((s) => s.videoTransform);
  const setVideoTransform = useStudio((s) => s.setVideoTransform);

  if (!videoUrl) return null;

  return (
    <div className="panel-section">
      <h3 className="panel-section-title">展示模式</h3>
      <div className="panel-section-body">
        <div className="grid-4">
          {FIT_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`card-btn sm ${
                videoTransform.fit === f.value ? 'active' : ''
              }`}
              onClick={() => setVideoTransform({ fit: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoReselectSection() {
  const videoFile = useStudio((s) => s.videoFile);
  const setVideoFile = useStudio((s) => s.setVideoFile);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!videoFile) return null;

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
    e.target.value = '';
  };

  return (
    <div className="panel-section">
      <h3 className="panel-section-title">视频重新选择</h3>
      <div className="panel-section-body">
        <div className="video-file-info">
          <div className="video-filename" title={videoFile.name}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="filename-text">{videoFile.name}</span>
          </div>
          <button
            type="button"
            className="video-action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="重新选择视频"
          >
            重新选择
          </button>
          <input
            type="file"
            accept="video/*"
            hidden
            ref={fileInputRef}
            onChange={onFilePicked}
          />
        </div>
      </div>
    </div>
  );
}

function ScreenFitSection() {
  const bgSource = useStudio((s) => s.bgSource);
  const screenTransform = useStudio((s) => s.screenTransform);
  const setScreenTransform = useStudio((s) => s.setScreenTransform);

  if (bgSource !== 'screen') return null;

  return (
    <div className="panel-section">
      <h3 className="panel-section-title">展示模式</h3>
      <div className="panel-section-body">
        <div className="grid-2">
          <button
            type="button"
            className={`card-btn sm ${
              screenTransform.fit === 'contain' ? 'active' : ''
            }`}
            onClick={() => setScreenTransform({ fit: 'contain' })}
          >
            适配
          </button>
          <button
            type="button"
            className={`card-btn sm ${
              screenTransform.fit === 'cover' ? 'active' : ''
            }`}
            onClick={() => setScreenTransform({ fit: 'cover' })}
          >
            铺满
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenReselectSection() {
  const bgSource = useStudio((s) => s.bgSource);
  const { request, stop } = useScreenShare();

  if (bgSource !== 'screen') return null;

  return (
    <div className="panel-section">
      <h3 className="panel-section-title">重新选择共享屏幕</h3>
      <div className="panel-section-body">
        <button
          type="button"
          className="card-btn sm full-width"
          onClick={() => {
            void request();
          }}
        >
          选择新屏幕
        </button>
        <button
          type="button"
          className="end-share-btn"
          onClick={stop}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          结束共享
        </button>
      </div>
    </div>
  );
}

function BackgroundSection() {
  const collapsed = useStudio((s) => s.panelCollapsed.background);
  const resetBackgroundAll = useStudio((s) => s.resetBackgroundAll);

  return (
    <div className="panel-section background-panel">
      <SectionHeader
        panelKey="background"
        label="配色调节"
        collapsed={collapsed}
      />
      {!collapsed && (
        <div className="panel-section-body">
          <BackgroundPicker />

          <button
            type="button"
            className="reset-bg-btn"
            onClick={resetBackgroundAll}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>复原默认</span>
          </button>
        </div>
      )}
    </div>
  );
}
