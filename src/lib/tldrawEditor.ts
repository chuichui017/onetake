import type { Editor } from '@tldraw/tldraw';

let sharedEditor: Editor | null = null;
const subscribers = new Set<(e: Editor | null) => void>();

export function setTldrawEditor(editor: Editor | null): void {
  sharedEditor = editor;
  subscribers.forEach((fn) => fn(sharedEditor));
}

export function getTldrawEditor(): Editor | null {
  return sharedEditor;
}

export function subscribeTldrawEditor(
  fn: (e: Editor | null) => void
): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
