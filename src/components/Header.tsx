'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  PictureInPicture2,
  Settings,
  Type,
} from 'lucide-react';
import { useStudio, type CanvasSize } from '@/lib/store';

interface HeaderProps {
  onOpenFloating: () => void;
  floatingActive: boolean;
}

const RATIOS: CanvasSize[] = ['9:16', '16:9', '3:4', '1:1'];

function RatioQuickPicker() {
  const canvasSize = useStudio((s) => s.canvasSize);
  const setCanvasSize = useStudio((s) => s.setCanvasSize);
  const [open, setOpen] = useState(false);

  return (
    <div className="ratio-picker">
      <button
        type="button"
        className="ratio-picker-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {canvasSize}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div
            className="ratio-picker-backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="ratio-picker-menu" role="menu">
            {RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                className={`ratio-picker-item${r === canvasSize ? ' active' : ''}`}
                onClick={() => {
                  setCanvasSize(r);
                  setOpen(false);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Header({ onOpenFloating, floatingActive }: HeaderProps) {
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
  const showToast = useStudio((s) => s.showToast);

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
        <button
          id="pipBtn"
          className={`header-btn${floatingActive ? ' active' : ''}`}
          onClick={onOpenFloating}
          title="悬浮工作台 · 永远置顶"
          aria-label="floating studio"
        >
          <PictureInPicture2 size={14} />
          <span>悬浮</span>
        </button>
        <button
          className="header-btn"
          onClick={() => showToast('导出功能 v1.0 实现')}
          title="导出"
          aria-label="export"
        >
          <Download size={14} />
          <span>导出</span>
        </button>
        <button
          className="header-btn"
          onClick={() => showToast('设置 v1.0 补充')}
          title="设置"
          aria-label="settings"
        >
          <Settings size={14} />
          <span>设置</span>
        </button>
        <div style={{ width: 8 }} />
        <RatioQuickPicker />
        <div style={{ width: 6 }} />
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
