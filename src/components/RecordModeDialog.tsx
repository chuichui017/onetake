'use client';

import { useStudio } from '@/lib/store';

export function RecordModeDialog() {
  const showRecordModeDialog = useStudio((s) => s.showRecordModeDialog);
  const closeRecordModeDialog = useStudio((s) => s.closeRecordModeDialog);
  const startRecordingAction = useStudio((s) => s.startRecordingAction);

  if (!showRecordModeDialog) return null;

  return (
    <div className="record-dialog-backdrop" onClick={closeRecordModeDialog}>
      <div className="record-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="record-dialog-title">选择录制模式</div>
        <div className="record-dialog-subtitle">你希望录制哪部分画面？</div>

        <div className="record-mode-options">
          <button
            className="record-mode-card"
            onClick={() => startRecordingAction('board-only')}
          >
            <div className="record-mode-preview board-only-preview"></div>
            <div className="record-mode-label">仅画板</div>
            <div className="record-mode-desc">纯白画板铺满画面</div>
          </button>

          <button
            className="record-mode-card"
            onClick={() => startRecordingAction('with-bg')}
          >
            <div className="record-mode-preview with-bg-preview">
              <div className="preview-board-inner"></div>
            </div>
            <div className="record-mode-label">含背景</div>
            <div className="record-mode-desc">画板 + 周边背景氛围</div>
          </button>
        </div>

        <button
          className="record-dialog-cancel"
          onClick={closeRecordModeDialog}
        >
          取消
        </button>
      </div>
    </div>
  );
}
