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

          // 用户在白板上画/写/贴东西时，自动收起场景空状态提示。
          // source: 'user' 排除掉 page-switch、初次 mount 等系统性变更，
          // scope: 'document' 只关心真实的形状增删改，不被视口缩放/平移触发。
          const unsubscribeEdits = editor.store.listen(
            () => {
              const { hintDismissed, dismissHint } = useStudio.getState();
              if (!hintDismissed) dismissHint();
            },
            { source: 'user', scope: 'document' }
          );

          return () => {
            unsubscribeEdits();
            setTldrawEditor(null);
          };
        }}
      />
    </div>
  );
}
