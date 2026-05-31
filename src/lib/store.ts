import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { scenes, type SceneId } from './scenes';
import { getTldrawEditor, switchToScenePage } from './tldrawEditor';
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
import { hexToRgba, getBeautyFilter } from './utils';
import { getRecordingRefs } from './recordingRefs';

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
  teleCollapsed: boolean;
  voiceSync: boolean;
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

// 切到「从未访问过」的场景时用来重置背景，避免上一个场景的配色"漏"过来。
// 已访问过的场景由 sceneStates 快照负责恢复，不走这里。
const DEFAULT_BACKGROUND: BackgroundState = {
  type: 'default',
  value: '#FAFAFA',
  pattern: null,
  patternColor: '#09090B',
  patternOpacity: 0.4,
  patternBase: '#FAFAFA',
  blurStrength: 40,
  blurSaturation: 150,
};

const DEFAULT_STAGE_COLOR = '#FFFFFF';

const VIDEO_SHADOWS_CSS: Record<
  VideoCardShadow,
  { blur: number; offsetY: number; color: string } | null
> = {
  none: null,
  small: { blur: 12, offsetY: 4, color: 'rgba(0,0,0,0.1)' },
  medium: { blur: 32, offsetY: 12, color: 'rgba(0,0,0,0.15)' },
  large: { blur: 64, offsetY: 24, color: 'rgba(0,0,0,0.25)' },
};

export interface SceneState {
  videoFile: File | null;
  videoUrl: string | null;
  videoPlaying: boolean;
  videoMuted: boolean;
  videoVolume: number;
  videoPlaybackRate: number;
  videoTransform: VideoTransform;
  bgSource: BgSource;
  webcamShape: WebcamShape;
  webcamSize: number;
  customWebcamPos: Pos | null;
  background: BackgroundState;
  stageColor: string;
  videoCard: VideoCard;
  canvasRatio: CanvasSize;
}

interface StudioState extends PersistedTele {
  scene: SceneId;
  sceneStates: Partial<Record<SceneId, SceneState>>;
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
  /**
   * 用户做过"配置类编辑"（改背景、调人像形状/大小/位置/边框/美颜）后置 true。
   * 此时 CanvasHint 切到紧凑态：只渲染动作按钮（上传视频/共享屏幕/开始创作）。
   * 真正点了"开始创作"或开始创作内容（画白板/导入视频/共享屏幕）才会把
   * hintDismissed 置 true 完全隐藏。
   */
  hintCompact: boolean;

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

const stripSceneRuntime = (s: SceneState): SceneState => ({
  ...s,
  videoFile: null,
  videoUrl: null,
  videoPlaying: false,
});

const persisted = (s: StudioState): Partial<StudioState> => ({
  // teleprompter prefs
  telePos: s.telePos,
  teleSize: s.teleSize,
  teleTheme: s.teleTheme,
  teleTransparency: s.teleTransparency,
  teleFontSize: s.teleFontSize,
  teleNotchMode: s.teleNotchMode,
  teleSpeed: s.teleSpeed,
  teleText: s.teleText,
  teleCollapsed: s.teleCollapsed,
  voiceSync: s.voiceSync,
  // panel prefs
  panelCollapsed: s.panelCollapsed,
  panelHidden: s.panelHidden,
  // record prefs
  recordWithBackground: s.recordWithBackground,
  // scene
  scene: s.scene,
  sceneStates: Object.fromEntries(
    Object.entries(s.sceneStates).map(([k, v]) => [
      k,
      v ? stripSceneRuntime(v) : v,
    ])
  ) as Partial<Record<SceneId, SceneState>>,
  // top-level scene-derived state (mirrors current scene's snapshot)
  webcamShape: s.webcamShape,
  webcamSize: s.webcamSize,
  customWebcamPos: s.customWebcamPos,
  canvasSize: s.canvasSize,
  bgSource: s.bgSource,
  background: s.background,
  customGradient: s.customGradient,
  videoTransform: s.videoTransform,
  videoMuted: s.videoMuted,
  videoVolume: s.videoVolume,
  videoPlaybackRate: s.videoPlaybackRate,
  border: s.border,
  beauty: s.beauty,
  stageColor: s.stageColor,
  videoCard: s.videoCard,
  screenTransform: s.screenTransform,
  // 一旦用户在某次会话里"开始编辑过"（手动关掉提示、改了配色、画过白板…
  // 都会把它置 true），刷新后就别再弹出来打扰他。新用户首次打开时
  // localStorage 里没有这条，依然 false，所以引导照常出现。
  hintDismissed: s.hintDismissed,
  hintCompact: s.hintCompact,
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
      sceneStates: {},
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
      background: { ...DEFAULT_BACKGROUND },
      customGradient: { start: '#F5F3FF', end: '#DBEAFE', angle: 135 },
      toast: null,
      hintDismissed: false,
      hintCompact: false,
      panelCollapsed: { ...DEFAULT_PANEL_COLLAPSED },
      stageColor: DEFAULT_STAGE_COLOR,
      recordWithBackground: true,
      videoCard: { ...DEFAULT_VIDEO_CARD },
      layers: createDefaultLayers(),

      setScene: (id) => {
        const cur = get().scene;
        if (cur === id) return;

        // Each scene maps to its own tldraw page, so shapes drawn in one
        // scene don't appear in others.
        const editor = getTldrawEditor();
        if (editor) switchToScenePage(editor, id);

        const snapshot: SceneState = {
          videoFile: get().videoFile,
          videoUrl: get().videoUrl,
          videoPlaying: get().videoPlaying,
          videoMuted: get().videoMuted,
          videoVolume: get().videoVolume,
          videoPlaybackRate: get().videoPlaybackRate,
          videoTransform: { ...get().videoTransform },
          bgSource: get().bgSource,
          webcamShape: get().webcamShape,
          webcamSize: get().webcamSize,
          customWebcamPos: get().customWebcamPos,
          background: { ...get().background },
          stageColor: get().stageColor,
          videoCard: { ...get().videoCard },
          canvasRatio: get().canvasSize,
        };
        set((st) => ({
          sceneStates: { ...st.sceneStates, [cur]: snapshot },
        }));

        const saved = get().sceneStates[id];
        const buildBackgroundLayerSource = (bg: BackgroundState): LayerSource => {
          if (bg.type === 'default') return { kind: 'color', value: '#FAFAFA' };
          if (bg.type === 'solid') return { kind: 'color', value: bg.value };
          if (bg.type === 'gradient') return { kind: 'gradient', value: bg.value };
          if (bg.type === 'blur') {
            return {
              kind: 'blur',
              strength: bg.blurStrength,
              saturation: bg.blurSaturation,
            };
          }
          return {
            kind: 'pattern',
            pattern: bg.pattern ?? 'dots',
            color: bg.patternColor,
            bgColor: bg.patternBase,
            opacity: bg.patternOpacity,
          };
        };
        const buildContentLayerSource = (
          src: BgSource,
          videoUrl: string | null,
          playing: boolean
        ): LayerSource => {
          if (src === 'screen') return { kind: 'screen' };
          if (src === 'video') {
            return { kind: 'video-file', url: videoUrl, playing, currentTime: 0 };
          }
          return { kind: 'whiteboard' };
        };

        if (saved) {
          set({
            scene: id,
            videoFile: saved.videoFile,
            videoUrl: saved.videoUrl,
            videoPlaying: saved.videoPlaying,
            videoMuted: saved.videoMuted,
            videoVolume: saved.videoVolume,
            videoPlaybackRate: saved.videoPlaybackRate,
            videoTransform: { ...saved.videoTransform },
            bgSource: saved.bgSource,
            webcamShape: saved.webcamShape,
            webcamSize: saved.webcamSize,
            customWebcamPos: saved.customWebcamPos,
            background: { ...saved.background },
            stageColor: saved.stageColor,
            videoCard: { ...saved.videoCard },
            canvasSize: saved.canvasRatio,
            hintDismissed: false,
            hintCompact: false,
            teleprompterVisible: false,
          });
          get().patchLayerByType('background', {
            source: buildBackgroundLayerSource(saved.background),
          });
          get().patchLayerByType('content', {
            source: buildContentLayerSource(
              saved.bgSource,
              saved.videoUrl,
              saved.videoPlaying
            ),
          });
          get().patchLayerByType('persona', {
            style: { shape: saved.webcamShape },
            transform: saved.customWebcamPos
              ? {
                  x: saved.customWebcamPos.left,
                  y: saved.customWebcamPos.top,
                  width: saved.webcamSize,
                  height: saved.webcamSize,
                }
              : { width: saved.webcamSize, height: saved.webcamSize },
          });
        } else {
          const p = scenes[id];
          const freshBg: BackgroundState = { ...DEFAULT_BACKGROUND };
          set({
            scene: id,
            webcamShape: p.webcamShape,
            webcamSize: p.webcamSize,
            customWebcamPos: null,
            bgSource: p.bgSource,
            canvasSize: '16:9',
            hintDismissed: false,
            hintCompact: false,
            teleprompterVisible: false,
            // 首次进入这个场景：重置背景到默认，断开跟上一个场景的关联。
            // 之前没有这两行 → 上个场景的画板颜色会"漏"到新场景里。
            background: freshBg,
            stageColor: DEFAULT_STAGE_COLOR,
          });
          get().patchLayerByType('persona', {
            style: { shape: p.webcamShape },
            transform: { width: p.webcamSize, height: p.webcamSize },
          });
          get().patchLayerByType('content', {
            source: buildContentLayerSource(
              p.bgSource,
              get().videoUrl,
              get().videoPlaying
            ),
          });
          get().patchLayerByType('background', {
            source: buildBackgroundLayerSource(freshBg),
          });
        }
      },
      setWebcamShape: (s) => {
        set({ webcamShape: s, hintCompact: true });
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
        set({ webcamSize: n, hintCompact: true });
        get().patchLayerByType('persona', {
          transform: { width: n, height: n },
        });
      },
      setCustomWebcamPos: (p) => {
        set({ customWebcamPos: p, hintCompact: true });
        if (p) {
          get().patchLayerByType('persona', {
            transform: { x: p.left, y: p.top },
          });
        }
      },
      setCanvasSize: (s) => set({ canvasSize: s }),
      setBorder: (patch) => {
        set((st) => ({ border: { ...st.border, ...patch }, hintCompact: true }));
        const next = get().border;
        get().patchLayerByType('persona', {
          style: { border: { enabled: next.enabled, color: next.color, width: 3 } },
        });
      },
      setBeauty: (b) => set({ beauty: b, hintCompact: true }),
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
        const bgState = get().background;
        let backgroundColor: string;
        let bgPatternKind: BackgroundPattern | null = null;
        if (!recordWithBackground) {
          backgroundColor = '#FFFFFF';
        } else if (bgState.type === 'solid' || bgState.type === 'gradient') {
          backgroundColor = bgState.value;
        } else if (bgState.type === 'pattern' && bgState.pattern) {
          backgroundColor = bgState.patternBase;
          bgPatternKind = bgState.pattern;
        } else {
          // default / blur / pattern-without-kind → 用 stageColor
          backgroundColor = get().stageColor;
        }

        const refs = getRecordingRefs();
        const uploadedVideoEl = refs.uploadedVideo;
        const videoCardEl = refs.videoCard;
        const webcamEl = refs.webcamVideo;
        const webcamLayerEl = refs.webcamLayer;
        const stageEl = refs.stageShell;

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

          const stageRect = stageEl?.getBoundingClientRect() ?? null;
          const canvasOut = getResolutionForRatio(ratio);
          const screenBorderRadius =
            stageRect && stageRect.width > 0
              ? (get().videoCard.borderRadius * canvasOut.width) /
                stageRect.width
              : get().videoCard.borderRadius;

          const screenWrapEl = refs.screenWrap;
          let screenPosition: {
            x: number;
            y: number;
            width: number;
            height: number;
          } | null = null;
          if (stageEl && screenWrapEl && stageRect && stageRect.width > 0) {
            const sRect = screenWrapEl.getBoundingClientRect();
            screenPosition = {
              x: (sRect.left - stageRect.left) / stageRect.width,
              y: (sRect.top - stageRect.top) / stageRect.height,
              width: sRect.width / stageRect.width,
              height: sRect.height / stageRect.height,
            };
            console.log('[store] screen position from UI:', screenPosition, {
              sRect: {
                x: sRect.left - stageRect.left,
                y: sRect.top - stageRect.top,
                w: sRect.width,
                h: sRect.height,
              },
            });
          }

          const cardShadow = VIDEO_SHADOWS_CSS[get().videoCard.shadow];
          const scaleForShadow =
            stageRect && stageRect.width > 0
              ? canvasOut.width / stageRect.width
              : 1;
          const screenShadow = cardShadow
            ? {
                blur: cardShadow.blur * scaleForShadow,
                offsetY: cardShadow.offsetY * scaleForShadow,
                color: cardShadow.color,
              }
            : null;

          let screenBgPattern: {
            kind: BackgroundPattern;
            color: string;
            scale: number;
          } | null = null;
          if (recordWithBackground && bgPatternKind) {
            const stageW = stageRect?.width ?? canvasOut.width;
            screenBgPattern = {
              kind: bgPatternKind,
              color: hexToRgba(bgState.patternColor, bgState.patternOpacity),
              scale: stageW > 0 ? canvasOut.width / stageW : 1,
            };
          }

          console.log(
            '[store] sending bg to recorder:',
            backgroundColor,
            'pattern:',
            bgPatternKind,
            'shape:',
            shape
          );

          try {
            const { stop } = await startScreenShareRecording({
              screenStream,
              webcamVideoEl: webcamEl,
              webcamShape: shape,
              webcamPosition,
              screenPosition,
              backgroundColor,
              bgPattern: screenBgPattern,
              canvasRatio: ratio,
              screenBorderRadius,
              screenShadow,
              tldrawEditor: getTldrawEditor(),
              webcamFilter: getBeautyFilter(get().beauty, scaleForShadow),
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

        // 纯板模式（bgSource='board'）没有 video 卡片，紧贴裁切会塌缩到摄像头矩形，
        // 且 MP4/H.264 不支持 alpha——强制按 stage 整体出帧并填背景。
        const isBoardOnly = get().bgSource === 'board';
        const useFullStage = recordWithBackground || isBoardOnly;
        let effectiveRecordWithBackground = recordWithBackground;

        if (useFullStage) {
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
          if (isBoardOnly) effectiveRecordWithBackground = true;
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

        let bgPattern: {
          kind: BackgroundPattern;
          color: string;
          scale: number;
        } | null = null;
        if (bgPatternKind) {
          bgPattern = {
            kind: bgPatternKind,
            color: hexToRgba(bgState.patternColor, bgState.patternOpacity),
            scale: scaleX,
          };
        }

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
            recordWithBackground: effectiveRecordWithBackground,
            backgroundColor,
            bgPattern,
            uploadedVideoEl,
            webcamVideoEl: webcamEl,
            tldrawEditor: getTldrawEditor(),
            getVideoRect,
            getWebcamRect,
            webcamFilter: getBeautyFilter(get().beauty, scaleX),
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
          const { downloadBlob, generateFilename, extensionFromMime } =
            await import('./recorder');
          downloadBlob(blob, generateFilename(extensionFromMime(blob.type)));

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
          set((st) => ({
            cameraState: st.cameraState === 'off' ? 'preview' : st.cameraState,
            hintCompact: true,
          }));
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
        // 用户调整背景/配色 → 进入"紧凑提示"态：只显示 3 个动作按钮，
        // 隐藏标题/描述（仍然能引导下一步：上传视频 / 共享屏幕 / 开始创作）。
        set((st) => ({
          background: { ...st.background, ...patch },
          hintCompact: true,
        }));
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
      setStageColor: (color) => set({ stageColor: color, hintCompact: true }),
      setRecordWithBackground: (v) => set({ recordWithBackground: v }),
      setVideoCard: (patch) =>
        set((st) => ({ videoCard: { ...st.videoCard, ...patch } })),
      resetVideoCard: () => set({ videoCard: { ...DEFAULT_VIDEO_CARD } }),
      resetBackgroundAll: () => {
        set({
          stageColor: '#FFFFFF',
          customWebcamPos: null,
          videoCard: { ...DEFAULT_VIDEO_CARD },
          screenTransform: { scale: 1, x: 0, y: 0, fit: 'contain' },
        });
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
      merge: (persistedState, currentState) => {
        // Strip fields we no longer persist but which may exist in older
        // saved blobs (zustand's default merge would otherwise re-import
        // them and override the in-memory defaults).
        const incoming = { ...(persistedState as Partial<StudioState>) };
        delete (incoming as { hintDismissed?: boolean }).hintDismissed;
        return { ...currentState, ...incoming };
      },
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
