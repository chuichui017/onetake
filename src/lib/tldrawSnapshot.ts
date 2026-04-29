import type { Editor } from '@tldraw/tldraw';

export interface TldrawSnapshotter {
  getImage: () => HTMLImageElement | null;
  dispose: () => void;
}

// tldraw 4 renders to SVG inside .tl-canvas (not a <canvas>), so we cannot
// drawImage(svgEl) directly. Instead: serialize current shapes via
// editor.getSvgString(), load as <Image>, cache; refresh on store change with a
// debounce so per-frame draw is just a synchronous drawImage(cachedImage).
export function createTldrawSnapshotter(editor: Editor): TldrawSnapshotter {
  let currentImage: HTMLImageElement | null = null;
  let pending = false;
  let dirty = true;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    if (disposed || pending || !dirty) return;
    pending = true;
    dirty = false;
    try {
      const ids = Array.from(editor.getCurrentPageShapeIds());
      if (ids.length === 0) {
        currentImage = null;
        return;
      }
      const result = await editor.getSvgString(ids, {
        background: false,
        padding: 0,
        bounds: editor.getViewportPageBounds(),
      });
      if (disposed || !result) return;
      const blob = new Blob([result.svg], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      const ready = await new Promise<HTMLImageElement | null>((resolve) => {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
      URL.revokeObjectURL(url);
      if (!disposed && ready) currentImage = ready;
    } catch (err) {
      console.warn('[tldraw-snap] refresh failed:', err);
    } finally {
      pending = false;
      if (dirty && !disposed) schedule();
    }
  };

  const schedule = () => {
    if (timer !== null || disposed) return;
    timer = setTimeout(() => {
      timer = null;
      void refresh();
    }, 100);
  };

  const onChange = () => {
    dirty = true;
    schedule();
  };

  const unsub = editor.store.listen(onChange, {
    scope: 'document',
    source: 'all',
  });

  schedule();

  return {
    getImage: () => currentImage,
    dispose: () => {
      disposed = true;
      unsub();
      if (timer !== null) clearTimeout(timer);
    },
  };
}
