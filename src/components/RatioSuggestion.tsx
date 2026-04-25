'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useStudio, type CanvasSize } from '@/lib/store';

const STANDARD_RATIOS: { value: CanvasSize; ratio: number }[] = [
  { value: '9:16', ratio: 9 / 16 },
  { value: '3:4', ratio: 3 / 4 },
  { value: '1:1', ratio: 1 },
  { value: '16:10', ratio: 16 / 10 },
  { value: '16:9', ratio: 16 / 9 },
];

const RATIO_TOLERANCE = 0.02;

export default function RatioSuggestion() {
  const videoUrl = useStudio((s) => s.videoUrl);
  const canvasSize = useStudio((s) => s.canvasSize);
  const setCanvasSize = useStudio((s) => s.setCanvasSize);
  const [suggested, setSuggested] = useState<CanvasSize | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl || dismissed === videoUrl) {
      return;
    }

    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    probe.src = videoUrl;
    probe.onloadedmetadata = () => {
      const w = probe.videoWidth;
      const h = probe.videoHeight;
      if (!w || !h) return;
      const aspect = w / h;
      const nearest = STANDARD_RATIOS.reduce((prev, cur) =>
        Math.abs(cur.ratio - aspect) < Math.abs(prev.ratio - aspect)
          ? cur
          : prev
      );
      const currentRatio =
        STANDARD_RATIOS.find((s) => s.value === canvasSize)?.ratio ?? 16 / 9;
      const currentDiff = Math.abs(currentRatio - aspect);
      if (currentDiff >= RATIO_TOLERANCE && nearest.value !== canvasSize) {
        setSuggested(nearest.value);
      } else {
        setSuggested(null);
      }
    };

    return () => {
      probe.onloadedmetadata = null;
      probe.src = '';
    };
  }, [videoUrl, canvasSize, dismissed]);

  if (!suggested || !videoUrl) return null;

  const apply = () => {
    setCanvasSize(suggested);
    setSuggested(null);
  };

  const dismiss = () => {
    setDismissed(videoUrl);
    setSuggested(null);
  };

  return (
    <div className="ratio-suggestion">
      <span>视频比例与画板不匹配，建议切换到 {suggested}</span>
      <button type="button" onClick={apply}>
        一键适配
      </button>
      <button type="button" className="dismiss" onClick={dismiss} aria-label="关闭">
        <X size={14} />
      </button>
    </div>
  );
}
