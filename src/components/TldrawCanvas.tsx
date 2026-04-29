'use client';

import { Tldraw } from '@tldraw/tldraw';
import { setTldrawEditor } from '@/lib/tldrawEditor';

export default function TldrawCanvas() {
  return (
    <div className="tldraw-host">
      <Tldraw
        onMount={(editor) => {
          setTldrawEditor(editor);
          return () => {
            setTldrawEditor(null);
          };
        }}
      />
    </div>
  );
}
