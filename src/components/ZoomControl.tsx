'use client';

import { Minus, Plus } from 'lucide-react';
import { useStudio, CANVAS_ZOOM_MIN, CANVAS_ZOOM_MAX } from '@/lib/store';

const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];

function stepOut(cur: number, dir: 1 | -1): number {
  const eps = 1e-3;
  if (dir === 1) {
    const next = STEPS.find((s) => s > cur + eps);
    return Math.min(CANVAS_ZOOM_MAX, next ?? CANVAS_ZOOM_MAX);
  }
  const prev = [...STEPS].reverse().find((s) => s < cur - eps);
  return Math.max(CANVAS_ZOOM_MIN, prev ?? CANVAS_ZOOM_MIN);
}

export function ZoomControl() {
  const zoom = useStudio((s) => s.canvasZoom);
  const setCanvasZoom = useStudio((s) => s.setCanvasZoom);
  const resetCanvasView = useStudio((s) => s.resetCanvasView);

  return (
    <div
      className="canvas-zoom"
      role="group"
      aria-label="canvas zoom"
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title="缩小"
        aria-label="zoom out"
        onClick={() => setCanvasZoom(stepOut(zoom, -1))}
        disabled={zoom <= CANVAS_ZOOM_MIN + 1e-3}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        className="zoom-pct"
        title="重置缩放"
        onClick={resetCanvasView}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        title="放大"
        aria-label="zoom in"
        onClick={() => setCanvasZoom(stepOut(zoom, 1))}
        disabled={zoom >= CANVAS_ZOOM_MAX - 1e-3}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
