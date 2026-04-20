'use client';

import { useEffect } from 'react';
import { useStudio } from '@/lib/store';
import type { SceneId } from '@/lib/scenes';

export function useHotkeys() {
  const setScene = useStudio((s) => s.setScene);
  const toggleTelePlaying = useStudio((s) => s.toggleTelePlaying);
  const setScreenTransform = useStudio((s) => s.setScreenTransform);
  const resetScreenTransform = useStudio((s) => s.resetScreenTransform);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        setScene(Number(e.key) as SceneId);
        e.preventDefault();
        return;
      }
      if (e.code === 'Space') {
        toggleTelePlaying();
        e.preventDefault();
        return;
      }
      if (e.key === '=' || e.key === '+') {
        const st = useStudio.getState().screenTransform;
        setScreenTransform({ scale: Math.min(4, st.scale + 0.08) });
        e.preventDefault();
        return;
      }
      if (e.key === '-' || e.key === '_') {
        const st = useStudio.getState().screenTransform;
        setScreenTransform({ scale: Math.max(0.3, st.scale - 0.08) });
        e.preventDefault();
        return;
      }
      if (e.key === '0') {
        resetScreenTransform();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setScene, toggleTelePlaying, setScreenTransform, resetScreenTransform]);
}
