import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { scenes, type SceneId } from './scenes';
import {
  type Layer,
  type LayerSource,
  createDefaultLayers,
  patchLayer as patchLayerFn,
  patchLayerByType as patchLayerByTypeFn,
} from './layers';
import {
  startCamera,
  stopCamera as stopCameraStream,
  getCameraStream,
} from '@/hooks/useCamera';

export type WebcamShape =
  | 'circle'
  | 'rect-h'
  | 'rect-v'
  | 'square'
  | 'full'
  | 'split-top'
  | 'split-bottom'
  | 'hidden';

export type BgSource = 'board' | 'screen' | 'video';
export type CameraState = 'off' | 'preview' | 'recording';
export type BackgroundType = 'default' | 'solid' | 'gradient' | 'blur' | 'pattern';
export type BackgroundPattern = 'dots' | 'grid' | 'diagonal' | 'cross';

export interface BackgroundState {
  type: BackgroundType;
  value: string;
  pattern: BackgroundPattern | null;
  patternColor: string;
  patternOpacity: number;
  patternBase: string;
  blurStrength: number;
  blurSaturation: number;
}

export interface CustomGradient {
  start: string;
  end: string;
  angle: number;
}

export interface BorderState {
  enabled: boolean;
  color: string;
}

export type CanvasSize = '9:16' | '16:9' | '16:10' | '3:4' | '1:1';
export type TeleTheme = 'gray' | 'light' | 'dark' | 'black';
export type TeleTransparency = 'normal' | 'semi' | 'ultra';
export type TeleFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type BeautyMode = '关闭' | '自然' | '明亮' | '柔光';
export type FitMode = 'contain' | 'cover';
export type VideoFit = 'contain' | 'cover' | 'fill' | 'center';

export interface Pos {
  left: number;
  top: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface ScreenTransform {
  scale: number;
  x: number;
  y: number;
  fit: FitMode;
}

export interface VideoTransform {
  scale: number;
  x: number;
  y: number;
  fit: VideoFit;
}

const DEFAULT_VIDEO_TRANSFORM: VideoTransform = {
  scale: 1,
  x: 0,
  y: 0,
  fit: 'contain',
};

export interface CanvasPan {
  x: number;
  y: number;
}

export type PanelKey =
  | 'ratio'
  | 'persona'
  | 'background'
  | 'screen'
  | 'video';

export type PanelCollapsedMap = Record<PanelKey, boolean>;

interface PersistedTele {
  telePos: Pos | null;
  teleSize: Size;
  teleTheme: TeleTheme;
  teleTransparency: TeleTransparency;
  teleFontSize: TeleFontSize;
  teleNotchMode: boolean;
  teleSpeed: number;
  teleText: string;
  panelCollapsed: PanelCollapsedMap;
  stageColor: string;
  panelHidden: boolean;
  recordWithBackground: boolean;
  videoCard: VideoCard;
}

export type VideoCardShadow = 'none' | 'small' | 'medium' | 'large';

export interface VideoCard {
  x: number;
  y: number;
  scale: number;
  borderRadius: number;
  shadow: VideoCardShadow;
}

const DEFAULT_VIDEO_CARD: VideoCard = {
  x: 50,
  y: 50,
  scale: 1.0,
  borderRadius: 16,
  shadow: 'medium',
};

const VIDEO_SHADOWS_CSS: Record<
  VideoCardShadow,
  { blur: number; offsetY: number; color: string } | null
> = {
  none: null,
  small: { blur: 12, offsetY: 4, color: 'rgba(0,0,0,0.1)' },
  medium: { blur: 32, offsetY: 12, color: 'rgba(0,0,0,0.15)' },
  large: { blur: 64, offsetY: 24, color: 'rgba(0,0,0,0.25)' },
};

interface StudioState extends PersistedTele {
  scene: SceneId;
  webcamShape: WebcamShape;
  webcamSize: number;
  customWebcamPos: Pos | null;
  canvasSize: CanvasSize;
  border: BorderState;
  beauty: BeautyMode;
  bgSource: BgSource;
  videoFile: File | null;
  videoUrl: string | null;
  videoPlaying: boolean;
  videoMuted: boolean;
  videoVolume: number;
  videoPlaybackRate: number;
  videoTransform: VideoTransform;
  recording: boolean;
  isRecording: boolean;
  recordingStartTime: number | null;
  recordingDuration: number;
  countdownValue: number | null;
  _recorderStop: (() => Promise<Blob>) | null;
  _recordingTimer: ReturnType<typeof setInterval> | null;
  cameraState: CameraState;
  telePlaying: boolean;
  teleCollapsed: boolean;
  teleprompterVisible: boolean;
  voiceSync: boolean;
  screenTransform: ScreenTransform;
  canvasZoom: number;
  canvasPan: CanvasPan;
  background: BackgroundState;
  customGradient: CustomGradient;
  toast: string | null;
  hintDismissed: boolean;

  setScene: (id: SceneId) => void;
  setWebcamShape: (s: WebcamShape) => void;
  setWebcamSize: (n: number) => void;
  setCustomWebcamPos: (p: Pos | null) => void;
  setCanvasSize: (s: CanvasSize) => void;
  setBorder: (patch: Partial<BorderState>) => void;
  setBeauty: (b: BeautyMode) => void;
  togglePanelCollapse: (key: PanelKey) => void;
  setBgSource: (s: BgSource) => void;
  setVideoFile: (file: File | null) => void;
  setVideoPlaying: (playing: boolean) => void;
  setVideoMuted: (muted: boolean) => void;
  setVideoVolume: (v: number) => void;
  setVideoPlaybackRate: (rate: number) => void;
  setVideoTransform: (t: Partial<VideoTransform>) => void;
  resetVideoTransform: () => void;
  removeVideo: () => void;
  toggleRecording: () => void;
  togglePanelHidden: () => void;
  startRecordingAction: () => Promise<void>;
  stopRecordingAction: () => Promise<void>;
  setCameraState: (s: CameraState) => void;
  startCameraPreview: () => Promise<void>;
  stopCamera: () => void;
  toggleTelePlaying: () => void;
  setTeleSpeed: (n: number) => void;
  setTeleText: (s: string) => void;
  setTelePos: (p: Pos | null) => void;
  setTeleSize: (s: Size) => void;
  cycleTeleTheme: () => void;
  setTeleTransparency: (t: TeleTransparency) => void;
  setTeleFontSize: (s: TeleFontSize) => void;
  bumpTeleFontSize: (dir: 1 | -1) => void;
  toggleTeleNotchMode: () => void;
  toggleVoiceSync: () => void;
  toggleTeleCollapsed: () => void;
  toggleTeleprompterVisible: () => void;
  setTeleprompterVisible: (v: boolean) => void;
  dismissHint: () => void;
  startKoubaoMode: () => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  setScreenTransform: (t: Partial<ScreenTransform>) => void;
  resetScreenTransform: () => void;
  cycleScreenFit: () => void;
  setCanvasZoom: (n: number) => void;
  resetCanvasZoom: () => void;
  setCanvasPan: (p: CanvasPan) => void;
  resetCanvasView: () => void;
  zoomAt: (factor: number, cx: number, cy: number) => void;
  setBackground: (patch: Partial<BackgroundState>) => void;
  setCustomGradient: (patch: Partial<CustomGradient>) => void;
  setStageColor: (color: string) => void;
  resetBackgroundAll: () => void;
  setRecordWithBackground: (v: boolean) => void;
  setVideoCard: (patch: Partial<VideoCard>) => void;
  resetVideoCard: () => void;
  layers: Layer[];
  setLayers: (layers: Layer[]) => void;
  patchLayer: (id: string, patch: Parameters<typeof patchLayerFn>[2]) => void;
  patchLayerByType: (
    type: Layer['type'],
    patch: Parameters<typeof patchLayerByTypeFn>[2]
  ) => void;
}

export const CANVAS_ZOOM_MIN = 0.25;
export const CANVAS_ZOOM_MAX = 4;

const FONT_ORDER: TeleFontSize[] = ['sm', 'md', 'lg', 'xl'];
const THEME_ORDER: TeleTheme[] = ['gray', 'light', 'dark', 'black'];

const defaultTeleText = `欢迎来到 OneTake——一个为中文科技/AI 博主打造的极简录制工作台。
白板即舞台，提词在眼前，屏幕可分屏，一键即录制。
按 空格 开始/暂停提词；按 1/2/3/4 切换场景；拖动人像到任何位置。`;

const persisted = (s: StudioState): PersistedTele => ({
  telePos: s.telePos,
  teleSize: s.teleSize,
  teleTheme: s.teleTheme,
  teleTransparency: s.teleTransparency,
  teleFontSize: s.teleFontSize,
  teleNotchMode: s.teleNotchMode,
  teleSpeed: s.teleSpeed,
  teleText: s.teleText,
  panelCollapsed: s.panelCollapsed,
  stageColor: s.stageColor,
  panelHidden: s.panelHidden,
  recordWithBackground: s.recordWithBackground,
  videoCard: s.videoCard,
});

const DEFAULT_PANEL_COLLAPSED: PanelCollapsedMap = {
  ratio: false,
  persona: false,
  background: false,
  screen: false,
  video: false,
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      scene: 1,
      webcamShape: 'circle',
      webcamSize: 180,
      customWebcamPos: null,
      canvasSize: '16:9',
      border: { enabled: false, color: '#FFFFFF' },
      beauty: '关闭',
      bgSource: 'board',
      videoFile: null,
      videoUrl: null,
      videoPlaying: false,
      videoMuted: true,
      videoVolume: 0.7,
      videoPlaybackRate: 1,
      videoTransform: { ...DEFAULT_VIDEO_TRANSFORM },
      recording: false,
      isRecording: false,
      recordingStartTime: null,
      recordingDuration: 0,
      countdownValue: null,
      _recorderStop: null,
      _recordingTimer: null,
      panelHidden: false,
      cameraState: 'off',
      telePlaying: false,
      telePos: null,
      teleSize: { w: 520, h: 220 },
      teleTheme: 'gray',
      teleTransparency: 'normal',
      teleFontSize: 'md',
      teleNotchMode: true,
      teleSpeed: 1,
      teleText: defaultTeleText,
      teleCollapsed: false,
      teleprompterVisible: false,
      voiceSync: false,
      screenTransform: { scale: 1, x: 0, y: 0, fit: 'contain' },
      canvasZoom: 1,
      canvasPan: { x: 0, y: 0 },
      background: {
        type: 'default',
        value: '#FAFAFA',
        pattern: null,
        patternColor: '#09090B',
        patternOpacity: 0.4,
        patternBase: '#FAFAFA',
        blurStrength: 40,
        blurSaturation: 150,
      },
      customGradient: { start: '#F5F3FF', end: '#DBEAFE', angle: 135 },
      toast: null,
      hintDismissed: false,
      panelCollapsed: { ...DEFAULT_PANEL_COLLAPSED },
      stageColor: '#FFFFFF',
      recordWithBackground: true,
      videoCard: { ...DEFAULT_VIDEO_CARD },
      layers: createDefaultLayers(),

      setScene: (id) => {
        const p = scenes[id];
        set({
          scene: id,
          webcamShape: p.webcamShape,
          webcamSize: p.webcamSize,
          bgSource: p.bgSource,
          hintDismissed: false,
        });
      },
      setWebcamShape: (s) => {
        set({ webcamShape: s });
        get().patchLayerByType('persona', { style: { shape: s } });
        if (s !== 'hidden') {
          void startCamera()
            .then(() => {
              if (get().cameraState === 'off') {
                set({ cameraState: 'preview' });
              }
            })
            .catch(() => {
              get().showToast('无法访问摄像头');
            });
        }
      },
      setWebcamSize: (n) => {
        set({ webcamSize: n });
        get().patchLayerByType('persona', {
          transform: { width: n, height: n },
        });
      },
      setCustomWebcamPos: (p) => {
        set({ customWebcamPos: p });
        if (p) {
          get().patchLayerByType('persona', {
            transform: { x: p.left, y: p.top },
          });
        }
      },
      setCanvasSize: (s) => set({ canvasSize: s }),
      setBorder: (patch) => {
        set((st) => ({ border: { ...st.border, ...patch } }));
        const next = get().border;
        get().patchLayerByType('persona', {
          style: { border: { enabled: next.enabled, color: next.color, width: 3 } },
        });
      },
      setBeauty: (b) => set({ beauty: b }),
      togglePanelCollapse: (key) =>
        set((st) => ({
          panelCollapsed: {
            ...st.panelCollapsed,
            [key]: !st.panelCollapsed[key],
          },
        })),
      setBgSource: (s) => {
        if (s === 'video' && !get().videoUrl) {
          set({ bgSource: 'board' });
          get().patchLayerByType('content', { source: { kind: 'whiteboard' } });
          return;
        }
        set({ bgSource: s });
        let source: LayerSource;
        if (s === 'screen') {
          source = { kind: 'screen' };
        } else if (s === 'video') {
          source = {
            kind: 'video-file',
            url: get().videoUrl,
            playing: get().videoPlaying,
            currentTime: 0,
          };
        } else {
          source = { kind: 'whiteboard' };
        }
        get().patchLayerByType('content', { source });
      },
      setVideoFile: (file) => {
        const prevUrl = get().videoUrl;
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        if (!file) {
          set({
            videoFile: null,
            videoUrl: null,
            videoPlaying: false,
            videoMuted: true,
            videoVolume: 0.7,
            videoPlaybackRate: 1,
            videoTransform: { ...DEFAULT_VIDEO_TRANSFORM },
            bgSource: 'board',
          });
          get().patchLayerByType('content', { source: { kind: 'whiteboard' } });
          return;
        }
        const url = URL.createObjectURL(file);
        set({
          videoFile: file,
          videoUrl: url,
          videoPlaying: false,
          videoMuted: true,
          videoVolume: 0.7,
          videoPlaybackRate: 1,
          videoTransform: { ...DEFAULT_VIDEO_TRANSFORM },
          bgSource: 'video',
        });
        get().patchLayerByType('content', {
          source: { kind: 'video-file', url, playing: false, currentTime: 0 },
        });
        get().showToast('视频已导入 · 已默认静音，可在控制条开启');
      },
      setVideoPlaying: (playing) => {
        set({ videoPlaying: playing });
        const content = get().layers.find((l) => l.type === 'content');
        if (content && content.source.kind === 'video-file') {
          get().patchLayerByType('content', {
            source: { ...content.source, playing },
          });
        }
      },
      setVideoMuted: (muted) => set({ videoMuted: muted }),
      setVideoVolume: (v) =>
        set({ videoVolume: Math.max(0, Math.min(1, v)) }),
      setVideoPlaybackRate: (rate) => set({ videoPlaybackRate: rate }),
      setVideoTransform: (t) =>
        set((st) => ({ videoTransform: { ...st.videoTransform, ...t } })),
      resetVideoTransform: () =>
        set((st) => ({
          videoTransform: { ...DEFAULT_VIDEO_TRANSFORM, fit: st.videoTransform.fit },
        })),
      removeVideo: () => {
        get().setVideoFile(null);
        get().showToast('视频已移除');
      },
      toggleRecording: () => {
        const st = get();
        if (!st.recording) {
          set({
            recording: true,
            cameraState: 'recording',
          });
        } else {
          const hasStream = getCameraStream() !== null;
          set({
            recording: false,
            cameraState: hasStream ? 'preview' : 'off',
          });
        }
      },
      togglePanelHidden: () => set((st) => ({ panelHidden: !st.panelHidden })),
      startRecordingAction: async () => {
        const { isRecordingSupported } = await import('./recorder');
        const check = isRecordingSupported();
        if (!check.supported) {
          get().showToast(check.reason || '录制不可用');
          return;
        }

        for (let i = 3; i >= 1; i--) {
          set({ countdownValue: i });
          await new Promise((r) => setTimeout(r, 1000));
        }
        set({ countdownValue: null });

        const ratio = get().canvasSize;
        const recordWithBackground = get().recordWithBackground;
        const backgroundColor = recordWithBackground
          ? get().stageColor
          : '#FFFFFF';

        const uploadedVideoEl = document.querySelector(
          'video.uploaded-video'
        ) as HTMLVideoElement | null;
        const videoCardEl = document.querySelector(
          '.video-card'
        ) as HTMLElement | null;
        const webcamEl = document.querySelector(
          'video.webcam-feed'
        ) as HTMLVideoElement | null;
        const webcamLayerEl = document.querySelector(
          '.webcam-layer'
        ) as HTMLElement | null;
        const stageEl = document.querySelector(
          '.stage-shell'
        ) as HTMLElement | null;

        const {
          getResolutionForRatio,
          startCompositeRecording,
          startScreenShareRecording,
        } = await import('./recorder');

        if (get().bgSource === 'screen') {
          const { getScreenStream } = await import('@/hooks/useScreenShare');
          const screenStream = getScreenStream();
          if (!screenStream) {
            get().showToast('屏幕共享未开启');
            return;
          }
          const shape = get().webcamShape;

          let webcamPosition: {
            x: number;
            y: number;
            width: number;
            height: number;
          } | null = null;
          if (shape !== 'hidden' && stageEl && webcamLayerEl) {
            const stageRect = stageEl.getBoundingClientRect();
            const camRect = webcamLayerEl.getBoundingClientRect();
            if (stageRect.width > 0 && stageRect.height > 0) {
              webcamPosition = {
                x: (camRect.left - stageRect.left) / stageRect.width,
                y: (camRect.top - stageRect.top) / stageRect.height,
                width: camRect.width / stageRect.width,
                height: camRect.height / stageRect.height,
              };
              console.log('[store] webcam position from UI:', webcamPosition, {
                stageRect: { w: stageRect.width, h: stageRect.height },
                camRect: {
                  x: camRect.left - stageRect.left,
                  y: camRect.top - stageRect.top,
                  w: camRect.width,
                  h: camRect.height,
                },
              });
            }
          }

          const bgColor = get().stageColor;
          console.log(
            '[store] sending bg color to recorder:',
            bgColor,
            'shape:',
            shape
          );

          try {
            const { stop } = await startScreenShareRecording({
              screenStream,
              webcamVideoEl: webcamEl,
              webcamShape: shape,
              webcamPosition,
              backgroundColor: bgColor,
              canvasRatio: ratio,
            });
            const timer = setInterval(() => {
              const s = get().recordingStartTime;
              if (s === null) return;
              set({ recordingDuration: Math.floor((Date.now() - s) / 1000) });
            }, 500);
            set({
              isRecording: true,
              recordingStartTime: Date.now(),
              recordingDuration: 0,
              _recorderStop: stop,
              _recordingTimer: timer,
            });
            get().showToast('录制已开始');
          } catch (err) {
            const e = err as { name?: string; message?: string };
            if (e?.name === 'NotAllowedError') {
              get().showToast('录制已取消');
            } else {
              get().showToast('录制启动失败：' + (e?.message || String(err)));
            }
          }
          return;
        }

        let recordingBoundsRect: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        let canvasOutput: { width: number; height: number };

        if (recordWithBackground) {
          const stageRect = stageEl?.getBoundingClientRect() ?? null;
          if (!stageRect || stageRect.width === 0) {
            get().showToast('画板尺寸未就绪');
            return;
          }
          recordingBoundsRect = {
            x: stageRect.left,
            y: stageRect.top,
            width: stageRect.width,
            height: stageRect.height,
          };
          canvasOutput = getResolutionForRatio(ratio);
        } else {
          const rects: DOMRect[] = [];
          if (videoCardEl) rects.push(videoCardEl.getBoundingClientRect());
          if (webcamLayerEl && get().webcamShape !== 'hidden') {
            rects.push(webcamLayerEl.getBoundingClientRect());
          }
          if (rects.length === 0) {
            get().showToast('录制时没有视频或摄像头');
            return;
          }
          const left = Math.min(...rects.map((r) => r.left));
          const top = Math.min(...rects.map((r) => r.top));
          const right = Math.max(...rects.map((r) => r.right));
          const bottom = Math.max(...rects.map((r) => r.bottom));
          recordingBoundsRect = {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
          };
          const dpr = 2;
          canvasOutput = {
            width: Math.round(recordingBoundsRect.width * dpr),
            height: Math.round(recordingBoundsRect.height * dpr),
          };
        }

        const scaleX = canvasOutput.width / recordingBoundsRect.width;
        const scaleY = canvasOutput.height / recordingBoundsRect.height;

        const shapeToOut = (
          s: WebcamShape
        ): 'circle' | 'rounded' | 'square' => {
          if (s === 'circle') return 'circle';
          if (s === 'square' || s === 'rect-h' || s === 'rect-v') return 'rounded';
          return 'square';
        };

        const getVideoRect = () => {
          if (
            get().bgSource !== 'video' ||
            !uploadedVideoEl ||
            !videoCardEl
          )
            return null;
          if (!uploadedVideoEl.videoWidth || !uploadedVideoEl.videoHeight)
            return null;
          const cRect = videoCardEl.getBoundingClientRect();
          if (cRect.width === 0 || cRect.height === 0) return null;

          const x = (cRect.left - recordingBoundsRect.x) * scaleX;
          const y = (cRect.top - recordingBoundsRect.y) * scaleY;
          const w = cRect.width * scaleX;
          const h = cRect.height * scaleY;

          const card = get().videoCard;
          const shadowCss = VIDEO_SHADOWS_CSS[card.shadow];
          const shadow = shadowCss
            ? {
                blur: shadowCss.blur * scaleX,
                offsetY: shadowCss.offsetY * scaleY,
                color: shadowCss.color,
              }
            : null;

          return {
            x,
            y,
            w,
            h,
            borderRadius: card.borderRadius * scaleX,
            shadow,
          };
        };

        const getWebcamRect = () => {
          if (!webcamEl) return null;
          if (!webcamEl.videoWidth || !webcamEl.videoHeight) return null;
          const shape = get().webcamShape;
          if (shape === 'hidden') return null;
          const wRect = webcamEl.getBoundingClientRect();
          if (wRect.width === 0) return null;

          const containerX = (wRect.left - recordingBoundsRect.x) * scaleX;
          const containerY = (wRect.top - recordingBoundsRect.y) * scaleY;
          const containerW = wRect.width * scaleX;
          const containerH = wRect.height * scaleY;

          // cover 模式：保持比例，铺满容器，溢出由 clip 裁切
          const videoAspect = webcamEl.videoWidth / webcamEl.videoHeight;
          const containerAspect = containerW / containerH;

          let finalW: number, finalH: number, finalX: number, finalY: number;
          if (videoAspect > containerAspect) {
            finalH = containerH;
            finalW = containerH * videoAspect;
            finalY = containerY;
            finalX = containerX - (finalW - containerW) / 2;
          } else {
            finalW = containerW;
            finalH = containerW / videoAspect;
            finalX = containerX;
            finalY = containerY - (finalH - containerH) / 2;
          }

          return {
            x: finalX,
            y: finalY,
            w: finalW,
            h: finalH,
            shape: shapeToOut(shape),
            containerX,
            containerY,
            containerW,
            containerH,
          };
        };

        try {
          const { stop } = await startCompositeRecording({
            width: canvasOutput.width,
            height: canvasOutput.height,
            recordWithBackground,
            backgroundColor,
            uploadedVideoEl,
            webcamVideoEl: webcamEl,
            getVideoRect,
            getWebcamRect,
          });

          const timer = setInterval(() => {
            const s = get().recordingStartTime;
            if (s === null) return;
            set({ recordingDuration: Math.floor((Date.now() - s) / 1000) });
          }, 500);

          set({
            isRecording: true,
            recordingStartTime: Date.now(),
            recordingDuration: 0,
            _recorderStop: stop,
            _recordingTimer: timer,
          });
          get().showToast('录制已开始');
        } catch (err) {
          set({ countdownValue: null });

          const e = err as { name?: string; message?: string };
          if (e?.name === 'NotAllowedError') {
            get().showToast('录制已取消');
          } else {
            get().showToast('录制启动失败：' + (e?.message || String(err)));
          }
        }
      },
      stopRecordingAction: async () => {
        const { _recorderStop, _recordingTimer, recordingDuration } = get();
        if (!_recorderStop) return;

        if (_recordingTimer) clearInterval(_recordingTimer);

        try {
          const blob = await _recorderStop();
          const { downloadBlob, generateFilename } = await import('./recorder');
          downloadBlob(blob, generateFilename());

          const m = Math.floor(recordingDuration / 60);
          const s = recordingDuration % 60;
          get().showToast(
            `录制完成 · ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          );
        } catch (err) {
          console.error(err);
          get().showToast('停止录制失败');
        } finally {
          set({
            isRecording: false,
            recordingStartTime: null,
            recordingDuration: 0,
            _recorderStop: null,
            _recordingTimer: null,
          });
        }
      },
      setCameraState: (s) => set({ cameraState: s }),
      startCameraPreview: async () => {
        try {
          await startCamera();
          if (get().cameraState === 'off') {
            set({ cameraState: 'preview' });
          }
        } catch {
          get().showToast('无法访问摄像头');
        }
      },
      stopCamera: () => {
        stopCameraStream();
        set({
          cameraState: 'off',
          recording: false,
        });
      },
      toggleTelePlaying: () => set((st) => ({ telePlaying: !st.telePlaying })),
      setTeleSpeed: (n) => set({ teleSpeed: n }),
      setTeleText: (s) => set({ teleText: s }),
      setTelePos: (p) => set({ telePos: p }),
      setTeleSize: (s) => set({ teleSize: s }),
      cycleTeleTheme: () =>
        set((st) => {
          const i = THEME_ORDER.indexOf(st.teleTheme);
          return { teleTheme: THEME_ORDER[(i + 1) % THEME_ORDER.length] };
        }),
      setTeleTransparency: (t) => set({ teleTransparency: t }),
      setTeleFontSize: (s) => set({ teleFontSize: s }),
      bumpTeleFontSize: (dir) => {
        const cur = get().teleFontSize;
        const i = FONT_ORDER.indexOf(cur);
        const next = Math.max(0, Math.min(FONT_ORDER.length - 1, i + dir));
        set({ teleFontSize: FONT_ORDER[next] });
      },
      toggleTeleNotchMode: () =>
        set((st) => ({ teleNotchMode: !st.teleNotchMode })),
      toggleVoiceSync: () => set((st) => ({ voiceSync: !st.voiceSync })),
      toggleTeleCollapsed: () =>
        set((st) => ({ teleCollapsed: !st.teleCollapsed })),
      toggleTeleprompterVisible: () =>
        set((st) => ({ teleprompterVisible: !st.teleprompterVisible })),
      setTeleprompterVisible: (v) => set({ teleprompterVisible: v }),
      dismissHint: () => set({ hintDismissed: true }),
      startKoubaoMode: () => {
        get().setWebcamShape('full');
        set({ teleprompterVisible: true, hintDismissed: true });
        void get().startCameraPreview();
      },
      showToast: (msg) => {
        set({ toast: msg });
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            if (useStudio.getState().toast === msg) set({ toast: null });
          }, 2500);
        }
      },
      clearToast: () => set({ toast: null }),
      setScreenTransform: (t) =>
        set((st) => ({ screenTransform: { ...st.screenTransform, ...t } })),
      resetScreenTransform: () =>
        set((st) => ({
          screenTransform: { scale: 1, x: 0, y: 0, fit: st.screenTransform.fit },
        })),
      cycleScreenFit: () =>
        set((st) => ({
          screenTransform: {
            ...st.screenTransform,
            fit: st.screenTransform.fit === 'contain' ? 'cover' : 'contain',
          },
        })),
      setCanvasZoom: (n) =>
        set({
          canvasZoom: Math.max(
            CANVAS_ZOOM_MIN,
            Math.min(CANVAS_ZOOM_MAX, n)
          ),
        }),
      resetCanvasZoom: () => set({ canvasZoom: 1, canvasPan: { x: 0, y: 0 } }),
      setCanvasPan: (p) => set({ canvasPan: p }),
      resetCanvasView: () => set({ canvasZoom: 1, canvasPan: { x: 0, y: 0 } }),
      setBackground: (patch) => {
        set((st) => ({ background: { ...st.background, ...patch } }));
        const bg = get().background;
        let source: LayerSource;
        if (bg.type === 'default') {
          source = { kind: 'color', value: '#FAFAFA' };
        } else if (bg.type === 'solid') {
          source = { kind: 'color', value: bg.value };
        } else if (bg.type === 'gradient') {
          source = { kind: 'gradient', value: bg.value };
        } else if (bg.type === 'blur') {
          source = {
            kind: 'blur',
            strength: bg.blurStrength,
            saturation: bg.blurSaturation,
          };
        } else {
          source = {
            kind: 'pattern',
            pattern: bg.pattern ?? 'dots',
            color: bg.patternColor,
            bgColor: bg.patternBase,
            opacity: bg.patternOpacity,
          };
        }
        get().patchLayerByType('background', { source });
      },
      setCustomGradient: (patch) => {
        const next = { ...get().customGradient, ...patch };
        const value = `linear-gradient(${next.angle}deg, ${next.start} 0%, ${next.end} 100%)`;
        set({ customGradient: next });
        get().setBackground({ type: 'gradient', value });
      },
      setStageColor: (color) => set({ stageColor: color }),
      setRecordWithBackground: (v) => set({ recordWithBackground: v }),
      setVideoCard: (patch) =>
        set((st) => ({ videoCard: { ...st.videoCard, ...patch } })),
      resetVideoCard: () => set({ videoCard: { ...DEFAULT_VIDEO_CARD } }),
      resetBackgroundAll: () => {
        set({ stageColor: '#FFFFFF' });
        get().setBackground({
          type: 'default',
          value: '#FAFAFA',
          pattern: null,
          patternColor: '#09090B',
          patternOpacity: 0.4,
          patternBase: '#FAFAFA',
        });
      },
      zoomAt: (factor, cx, cy) => {
        const st = get();
        const prevZoom = st.canvasZoom;
        const nextZoom = Math.max(
          CANVAS_ZOOM_MIN,
          Math.min(CANVAS_ZOOM_MAX, prevZoom * factor)
        );
        if (nextZoom === prevZoom) return;
        const ratio = nextZoom / prevZoom;
        const nx = cx + (st.canvasPan.x - cx) * ratio;
        const ny = cy + (st.canvasPan.y - cy) * ratio;
        set({ canvasZoom: nextZoom, canvasPan: { x: nx, y: ny } });
      },
      setLayers: (layers) => set({ layers }),
      patchLayer: (id, patch) =>
        set((state) => ({ layers: patchLayerFn(state.layers, id, patch) })),
      patchLayerByType: (type, patch) =>
        set((state) => ({
          layers: patchLayerByTypeFn(state.layers, type, patch),
        })),
    }),
    {
      name: 'onetake-studio',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => persisted(s as StudioState),
    }
  )
);

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__debugLayers = () => {
    const layers = useStudio.getState().layers;
     
    console.table(
      layers.map((l) => ({
        id: l.id,
        type: l.type,
        visible: l.visible,
         
        'source.kind': l.source.kind,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'source.value': (l.source as any).value ?? '-',
        shape: l.style.shape ?? '-',
        size: l.transform.width + 'x' + l.transform.height,
        pos: l.transform.x + ',' + l.transform.y,
        zIndex: l.style.zIndex,
      }))
    );
    return layers;
  };
}
