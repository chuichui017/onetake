'use client';

import { type CSSProperties } from 'react';
import { useStudio } from '@/lib/store';
import { useScreenShare } from '@/hooks/useScreenShare';
import { isStageDark } from '@/lib/utils';

interface CanvasHintProps {
  onRequestScreen: () => void | Promise<void>;
  stageW: number;
  stageH: number;
  transform: string;
}

function CameraPreviewBtn() {
  const cameraState = useStudio((s) => s.cameraState);
  const startCameraPreview = useStudio((s) => s.startCameraPreview);
  const stopCamera = useStudio((s) => s.stopCamera);
  const isPreview = cameraState === 'preview';
  const active = cameraState !== 'off';

  return (
    <button
      className={`stage-hint-btn ${active ? 'preview-active' : 'secondary'}`}
      onClick={active ? stopCamera : () => void startCameraPreview()}
      title={active ? '再次点击关闭摄像头' : '启动摄像头预览'}
    >
      <span className="stage-hint-btn-icon">
        {active ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
          </svg>
        )}
      </span>
      {isPreview ? '正在预览摄像头' : active ? '正在录制' : '预览摄像头'}
    </button>
  );
}

function ImportVideoBtn() {
  const setVideoFile = useStudio((s) => s.setVideoFile);

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) setVideoFile(file);
    };
    input.click();
  };

  return (
    <button className="stage-hint-btn primary" onClick={openFilePicker}>
      <span className="stage-hint-btn-icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </span>
      导入视频
    </button>
  );
}

export function CanvasHint({
  onRequestScreen,
  stageW,
  stageH,
  transform,
}: CanvasHintProps) {
  const scene = useStudio((s) => s.scene);
  const videoFile = useStudio((s) => s.videoFile);
  const bgSource = useStudio((s) => s.bgSource);
  const hintDismissed = useStudio((s) => s.hintDismissed);
  const hintCompact = useStudio((s) => s.hintCompact);
  const cameraState = useStudio((s) => s.cameraState);
  const webcamShape = useStudio((s) => s.webcamShape);
  const background = useStudio((s) => s.background);
  const stageColor = useStudio((s) => s.stageColor);
  const { stream: screenStream } = useScreenShare();

  if (videoFile) return null;
  if (bgSource === 'screen' && screenStream) return null;
  if (hintDismissed) return null;
  // 口播场景的摄像头默认占满整个画面（startKoubaoMode 会把人像设为 'full'），
  // 提示卡叠在脸上会很违和——所以口播一开摄像头就直接隐藏整张提示。
  if (scene === 3 && cameraState !== 'off') return null;
  // 任意场景下，如果用户把人像设成 全屏 / 上半屏 / 下半屏，画面中央会被
  // 摄像头覆盖，提示同样应该让位。
  if (
    cameraState !== 'off' &&
    (webcamShape === 'full' ||
      webcamShape === 'split-top' ||
      webcamShape === 'split-bottom')
  ) {
    return null;
  }

  // 紧凑态：用户已经做过"配置"动作（改背景、调人像形状/大小/位置/边框/美颜、
  // 开摄像头），不再渲染标题/描述/快捷键提示，只留下 3 个动作按钮当启动器。
  // 口播场景的提示卡设计特殊（一个大组合按钮），不参与紧凑态切换。
  const compact = hintCompact && scene !== 3;

  const dark = isStageDark(background, stageColor);

  const triggerScreenShare = async () => {
    try {
      await onRequestScreen();
    } catch {
      // user cancelled the system picker — request() already rolled back bgSource
    }
  };

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: stageW,
    height: stageH,
    transform,
    transformOrigin: 'center center',
    pointerEvents: 'none',
    zIndex: 50,
  };

  return (
    <div
      className={`canvas-hint${dark ? ' dark' : ''}${compact ? ' compact' : ''}`}
      style={overlayStyle}
    >
      {scene === 1 && <LectureHint compact={compact} />}
      {scene === 2 && (
        <SplitScreenHint compact={compact} onShare={triggerScreenShare} />
      )}
      {scene === 3 && <KoubaoHint />}
      {scene === 4 && <WhiteboardHint compact={compact} />}
    </div>
  );
}

function WhiteboardHint({ compact }: { compact: boolean }) {
  const dismissHint = useStudio((s) => s.dismissHint);

  const actions = (
    <div className="stage-hint-actions">
      <CameraPreviewBtn />
      <button className="stage-hint-btn primary" onClick={dismissHint}>
        <span className="stage-hint-btn-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 19V6M5 12l7-7 7 7" />
          </svg>
        </span>
        开始创作
      </button>
    </div>
  );

  if (compact) return actions;

  return (
    <>
      <div className="stage-hint-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>
      <h3 className="stage-hint-title">空白画板</h3>
      <p className="stage-hint-desc">自由创作空间 · 在这里绘画</p>
      <div className="stage-hint-shortcuts">
        <span>
          <kbd>D</kbd>画画
        </span>
        <span>
          <kbd>T</kbd>打字
        </span>
        <span>
          <kbd>R</kbd>矩形
        </span>
      </div>
      {actions}
    </>
  );
}

function LectureHint({ compact }: { compact: boolean }) {
  const actions = (
    <div className="stage-hint-actions">
      <CameraPreviewBtn />
      <ImportVideoBtn />
    </div>
  );

  if (compact) return actions;

  return (
    <>
      <div className="stage-hint-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <h3 className="stage-hint-title">讲解模式</h3>
      <p className="stage-hint-desc">白板 + 人像，适合知识讲解</p>

      {actions}
    </>
  );
}

function SplitScreenHint({
  compact,
  onShare,
}: {
  compact: boolean;
  onShare: () => void;
}) {
  const actions = (
    <div className="stage-hint-actions">
      <CameraPreviewBtn />
      <button className="stage-hint-btn primary" onClick={onShare}>
        <span className="stage-hint-btn-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
          </svg>
        </span>
        共享屏幕
      </button>
    </div>
  );

  if (compact) return actions;

  return (
    <>
      <div className="stage-hint-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <line x1="8" y1="22" x2="16" y2="22" />
          <line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      </div>
      <h3 className="stage-hint-title">共享屏幕</h3>
      <p className="stage-hint-desc">屏幕共享 + 人像讲解，适合教程录制</p>

      {actions}
      <p className="stage-hint-sub">点击选择一个窗口或整个屏幕</p>
    </>
  );
}

function KoubaoHint() {
  const startKoubaoMode = useStudio((s) => s.startKoubaoMode);

  return (
    <>
      <div className="stage-hint-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
        </svg>
      </div>
      <h3 className="stage-hint-title">口播模式</h3>
      <p className="stage-hint-desc">一个人对着镜头说话 · 适合短视频</p>

      <div className="koubao-usecases">
        💡 抖音短视频 · 小红书分享 · 口述干货
      </div>

      <button className="stage-hint-combo-btn" onClick={startKoubaoMode}>
        <div className="combo-btn-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M12 2l2.09 4.26L19 7.27l-3.5 3.41.83 4.82L12 13.27l-4.33 2.23.83-4.82L5 7.27l4.91-1.01L12 2z"
              fill="currentColor"
              fillOpacity="0.3"
            />
          </svg>
        </div>
        <div className="combo-btn-content">
          <div className="combo-btn-title">一键开启口播模式</div>
          <div className="combo-btn-desc">全屏人像 · 提词器 · 摄像头预览</div>
        </div>
        <div className="combo-btn-arrow">↗</div>
      </button>
    </>
  );
}

