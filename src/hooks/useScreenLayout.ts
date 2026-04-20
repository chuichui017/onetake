'use client';

import { useMemo } from 'react';
import { useStudio, type WebcamShape } from '@/lib/store';

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function computeScreenRect(
  stageW: number,
  stageH: number,
  shape: WebcamShape
): ScreenRect {
  if (shape === 'split-bottom') {
    return { left: 0, top: 0, width: stageW, height: stageH * 0.58 };
  }
  if (shape === 'split-top') {
    return {
      left: 0,
      top: stageH * 0.42,
      width: stageW,
      height: stageH * 0.58,
    };
  }
  return { left: 0, top: 0, width: stageW, height: stageH };
}

export function useScreenLayout(stageW: number, stageH: number): ScreenRect {
  const shape = useStudio((s) => s.webcamShape);
  return useMemo(
    () => computeScreenRect(stageW, stageH, shape),
    [stageW, stageH, shape]
  );
}
