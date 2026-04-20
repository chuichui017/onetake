'use client';

import {
  Download,
  PictureInPicture2,
  Settings,
  Type,
} from 'lucide-react';
import { useStudio } from '@/lib/store';

interface HeaderProps {
  onOpenFloating: () => void;
  floatingActive: boolean;
}

export function Header({ onOpenFloating, floatingActive }: HeaderProps) {
  const recording = useStudio((s) => s.recording);
  const teleprompterVisible = useStudio((s) => s.teleprompterVisible);
  const toggleTeleprompterVisible = useStudio(
    (s) => s.toggleTeleprompterVisible
  );
  const toggleRecording = useStudio((s) => s.toggleRecording);
  const showToast = useStudio((s) => s.showToast);

  return (
    <header
      className="flex items-center justify-between px-4"
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
        <button
          className={`record-btn${recording ? ' recording' : ''}`}
          onClick={toggleRecording}
        >
          <span className="record-dot" />
          <span>{recording ? '停止' : '开始录制'}</span>
        </button>
      </div>
    </header>
  );
}
