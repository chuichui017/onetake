'use client';

import { useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useFloatingStudio } from '@/hooks/useFloatingStudio';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { Stage } from './Stage';
import { RightPanel } from './RightPanel';
import { ScenesBar } from './ScenesBar';
import { Teleprompter } from './Teleprompter';
import { Toast } from './Toast';

export function Studio() {
  useHotkeys();
  const { stream } = useCamera();
  const { request: requestScreen } = useScreenShare();
  const floating = useFloatingStudio(stream);

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
            gridTemplateColumns: '56px 1fr 288px',
            flex: 1,
          }}
        >
          <Toolbar />
          <div className="main-center">
            <Stage onRequestScreen={requestScreen} />
            <ScenesBar onRequestScreen={requestScreen} />
          </div>
          <RightPanel />
        </main>
      </div>
      <Teleprompter />
      <Toast />
    </>
  );
}
