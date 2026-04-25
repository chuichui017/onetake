'use client';

import { useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useFloatingStudio } from '@/hooks/useFloatingStudio';
import { useStudio } from '@/lib/store';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { Stage } from './Stage';
import { RightPanel } from './RightPanel';
import { ScenesBar } from './ScenesBar';
import { Teleprompter } from './Teleprompter';
import { Toast } from './Toast';
import { RecordCountdown } from './RecordCountdown';
import RatioSuggestion from './RatioSuggestion';

export function Studio() {
  useHotkeys();
  const { stream } = useCamera();
  const { request: requestScreen } = useScreenShare();
  const floating = useFloatingStudio(stream);
  const panelHidden = useStudio((s) => s.panelHidden);

  useEffect(() => {
    // Block the browser's native page zoom: trackpad pinch arrives as
    // wheel + ctrlKey, and Safari also fires gesture* events. We handle
    // canvas zoom ourselves; everything else on the page should stay at
    // 100%.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const onGesture = (e: Event) => e.preventDefault();
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('gesturestart', onGesture);
    document.addEventListener('gesturechange', onGesture);
    document.addEventListener('gestureend', onGesture);
    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('gesturestart', onGesture);
      document.removeEventListener('gesturechange', onGesture);
      document.removeEventListener('gestureend', onGesture);
    };
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useStudio.getState().isRecording) {
        e.preventDefault();
        e.returnValue = '正在录制中，离开将丢失内容';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <>
      <div className="flex flex-col h-screen">
        <Header
          onOpenFloating={() =>
            floating.active ? floating.close() : void floating.open()
          }
          floatingActive={floating.active}
        />
        <main
          className="min-h-0"
          style={{
            display: 'grid',
            gridTemplateColumns: panelHidden ? '56px 1fr 0px' : '56px 1fr 288px',
            flex: 1,
            transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Toolbar />
          <div className="main-center">
            <Stage onRequestScreen={requestScreen} />
            <ScenesBar onRequestScreen={requestScreen} />
          </div>
          <div
            className="right-panel-wrap"
            style={{
              overflow: 'hidden',
              opacity: panelHidden ? 0 : 1,
              transform: panelHidden ? 'translateX(20px)' : 'translateX(0)',
              pointerEvents: panelHidden ? 'none' : 'auto',
              transition:
                'opacity 0.25s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <RightPanel />
          </div>
        </main>
      </div>
      <Teleprompter />
      <Toast />
      <RecordCountdown />
      <RatioSuggestion />
    </>
  );
}
