'use client';

import { useRef } from 'react';
import {
  useStudio,
  type CanvasSize,
  type WebcamShape,
  type BeautyMode,
  type PanelKey,
  type VideoFit,
} from '@/lib/store';
import { BackgroundPicker, STAGE_COLOR_PRESETS } from './BackgroundPicker';
import { useScreenShare } from '@/hooks/useScreenShare';
import { Trash2, Volume2, VolumeX } from 'lucide-react';

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

const RATIOS: CanvasSize[] = ['9:16', '16:9', '3:4', '1:1'];

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
  const canvasSize = useStudio((s) => s.canvasSize);
  const border = useStudio((s) => s.border);
  const beauty = useStudio((s) => s.beauty);
  const panelCollapsed = useStudio((s) => s.panelCollapsed);

  const setWebcamShape = useStudio((s) => s.setWebcamShape);
  const setWebcamSize = useStudio((s) => s.setWebcamSize);
  const setCanvasSize = useStudio((s) => s.setCanvasSize);
  const setBorder = useStudio((s) => s.setBorder);
  const setBeauty = useStudio((s) => s.setBeauty);

  return (
    <aside className="right-panel">
      <div className="right-panel-scroll">
        <div className="panel-section">
          <SectionHeader
            panelKey="ratio"
            label="画布比例"
            collapsed={panelCollapsed.ratio}
          />
          {!panelCollapsed.ratio && (
            <div className="panel-section-body">
              <div className="grid-4">
                {RATIOS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`card-btn mono ${canvasSize === r ? 'active' : ''}`}
                    onClick={() => setCanvasSize(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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

        <ScreenSharePanel />

        <VideoPanel />
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

function VideoPanel() {
  const videoFile = useStudio((s) => s.videoFile);
  const videoTransform = useStudio((s) => s.videoTransform);
  const videoPlaybackRate = useStudio((s) => s.videoPlaybackRate);
  const videoVolume = useStudio((s) => s.videoVolume);
  const videoMuted = useStudio((s) => s.videoMuted);
  const collapsed = useStudio((s) => s.panelCollapsed.video);
  const setVideoFile = useStudio((s) => s.setVideoFile);
  const setVideoTransform = useStudio((s) => s.setVideoTransform);
  const setVideoPlaybackRate = useStudio((s) => s.setVideoPlaybackRate);
  const setVideoVolume = useStudio((s) => s.setVideoVolume);
  const setVideoMuted = useStudio((s) => s.setVideoMuted);
  const removeVideo = useStudio((s) => s.removeVideo);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!videoFile) return null;

  const xVal = Math.round(videoTransform.x);
  const yVal = Math.round(videoTransform.y);

  const openFilePicker = () => fileInputRef.current?.click();
  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
    e.target.value = '';
  };

  return (
    <div className="panel-section video-panel">
      <SectionHeader panelKey="video" label="视频" collapsed={collapsed} />
      {!collapsed && (
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
              onClick={openFilePicker}
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

          <div className="sub-section">
            <div className="sub-label">播放速度</div>
            <div className="grid-5">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`card-btn sm mono ${videoPlaybackRate === s ? 'active' : ''}`}
                  onClick={() => setVideoPlaybackRate(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="sub-section">
            <div className="sub-label">展示模式</div>
            <div className="grid-4">
              {FIT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`card-btn sm ${videoTransform.fit === f.value ? 'active' : ''}`}
                  onClick={() => setVideoTransform({ fit: f.value })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sub-section">
            <div className="sub-label-row">
              <span className="sub-label">音量</span>
              <button
                type="button"
                className="mute-btn"
                onClick={() => setVideoMuted(!videoMuted)}
                title={videoMuted ? '取消静音' : '静音'}
              >
                {videoMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(videoVolume * 100)}
                onChange={(e) => setVideoVolume(Number(e.target.value) / 100)}
                className="value-slider"
                disabled={videoMuted}
              />
              <span className="slider-value">
                {Math.round(videoVolume * 100)}%
              </span>
            </div>
          </div>

          <div className="sub-section">
            <div className="sub-label-row">
              <span className="sub-label">尺寸</span>
              <span className="slider-value">
                {Math.round(videoTransform.scale * 100)}%
              </span>
            </div>
            <div className="slider-row">
              <input
                type="range"
                min={20}
                max={200}
                value={Math.round(videoTransform.scale * 100)}
                onChange={(e) =>
                  setVideoTransform({ scale: Number(e.target.value) / 100 })
                }
                className="value-slider"
              />
            </div>
          </div>

          <div className="sub-section">
            <div className="sub-label">位置</div>
            <div className="axis-row">
              <span className="axis-label">X</span>
              <input
                type="range"
                min={-400}
                max={400}
                value={xVal}
                onChange={(e) =>
                  setVideoTransform({ x: Number(e.target.value) })
                }
                className="value-slider"
              />
              <span className="slider-value">
                {xVal > 0 ? '+' : ''}
                {xVal}
              </span>
            </div>
            <div className="axis-row">
              <span className="axis-label">Y</span>
              <input
                type="range"
                min={-400}
                max={400}
                value={yVal}
                onChange={(e) =>
                  setVideoTransform({ y: Number(e.target.value) })
                }
                className="value-slider"
              />
              <span className="slider-value">
                {yVal > 0 ? '+' : ''}
                {yVal}
              </span>
            </div>
            <button
              type="button"
              className="reset-pos-btn"
              onClick={() => setVideoTransform({ x: 0, y: 0 })}
              title="重置位置到中心"
            >
              重置位置
            </button>
          </div>

          <button
            type="button"
            className="remove-video-btn"
            onClick={removeVideo}
          >
            <Trash2 size={14} />
            移除视频
          </button>
        </div>
      )}
    </div>
  );
}

function ScreenSharePanel() {
  const bgSource = useStudio((s) => s.bgSource);
  const screenTransform = useStudio((s) => s.screenTransform);
  const collapsed = useStudio((s) => s.panelCollapsed.screen);
  const setScreenTransform = useStudio((s) => s.setScreenTransform);
  const resetScreenTransform = useStudio((s) => s.resetScreenTransform);
  const { stop } = useScreenShare();

  if (bgSource !== 'screen') return null;

  const pct = Math.round(screenTransform.scale * 100);

  return (
    <div className="panel-section screen-share-panel">
      <SectionHeader
        panelKey="screen"
        label="屏幕共享"
        collapsed={collapsed}
      />
      {!collapsed && (
        <div className="panel-section-body">
          <div className="screen-status">
            <div className="screen-status-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="screen-status-text">
              <span className="screen-status-title">共享中</span>
              <span className="screen-status-dot" aria-hidden="true" />
            </div>
          </div>

          <div className="sub-section">
            <div className="sub-label">展示模式</div>
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

          <div className="sub-section">
            <div className="sub-label-row">
              <span className="sub-label">尺寸</span>
              <span className="slider-value">{pct}%</span>
            </div>
            <div className="slider-row">
              <input
                type="range"
                min={50}
                max={200}
                value={pct}
                onChange={(e) =>
                  setScreenTransform({ scale: Number(e.target.value) / 100 })
                }
                className="value-slider"
              />
            </div>
          </div>

          <button
            type="button"
            className="card-btn sm full-width reset-screen-btn"
            onClick={resetScreenTransform}
            title="重置缩放与位置"
          >
            重置
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
      )}
    </div>
  );
}

function BackgroundSection() {
  const collapsed = useStudio((s) => s.panelCollapsed.background);
  const stageColor = useStudio((s) => s.stageColor);
  const setStageColor = useStudio((s) => s.setStageColor);
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
          <div className="sub-section">
            <div className="sub-label-row">
              <span className="sub-label">画板</span>
              <span className="sub-hint">会进入成片</span>
            </div>
            <div className="swatch-row">
              {STAGE_COLOR_PRESETS.map((c) => {
                const active =
                  stageColor.toUpperCase() === c.value.toUpperCase();
                const isWhite = c.value.toUpperCase() === '#FFFFFF';
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`swatch${active ? ' swatch-active' : ''}`}
                    style={{
                      background: c.value,
                      ...(isWhite
                        ? {
                            boxShadow:
                              'inset 0 0 0 1px #E4E4E7, 0 1px 2px rgba(0,0,0,0.06)',
                          }
                        : {}),
                    }}
                    onClick={() => setStageColor(c.value)}
                    title={c.name}
                  />
                );
              })}
            </div>
            <div className="custom-picker">
              <input
                type="color"
                className="picker-dot"
                value={stageColor}
                onChange={(e) => setStageColor(e.target.value)}
              />
              <input
                type="text"
                className="hex-field"
                value={stageColor.toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) setStageColor(v);
                }}
                maxLength={7}
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div className="sub-section">
            <div className="sub-label">背景</div>
            <BackgroundPicker />
          </div>

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
