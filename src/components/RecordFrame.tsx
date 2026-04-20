'use client';

import { useStudio } from '@/lib/store';

interface RecordFrameProps {
  baseW: number;
  baseH: number;
  wrapW: number;
  wrapH: number;
}

export function RecordFrame({ baseW, baseH, wrapW, wrapH }: RecordFrameProps) {
  const recording = useStudio((s) => s.recording);
  const zoom = useStudio((s) => s.canvasZoom);
  const pan = useStudio((s) => s.canvasPan);

  if (!recording) return null;

  const w = baseW * zoom;
  const h = baseH * zoom;
  const left = wrapW / 2 + pan.x - w / 2;
  const top = wrapH / 2 + pan.y - h / 2;

  return (
    <div
      className="record-frame"
      style={{ left, top, width: w, height: h }}
      aria-hidden
    >
      <div className="record-frame-edge" />
      <div className="record-frame-label">
        <span className="rec-dot" />
        <span>REC · 录制范围</span>
      </div>
    </div>
  );
}
