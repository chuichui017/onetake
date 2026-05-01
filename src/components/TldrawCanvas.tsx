'use client';

import { Tldraw } from '@tldraw/tldraw';
import { setTldrawEditor, switchToScenePage } from '@/lib/tldrawEditor';
import { useStudio } from '@/lib/store';

export default function TldrawCanvas() {
  return (
    <div className="tldraw-host">
      <Tldraw
        onMount={(editor) => {
          setTldrawEditor(editor);
          switchToScenePage(editor, useStudio.getState().scene);
          return () => {
            setTldrawEditor(null);
          };
        }}
      />
    </div>
  );
}
