import { PageRecordType, type Editor, type TLPageId } from '@tldraw/tldraw';
import { scenes, type SceneId } from './scenes';

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

// One tldraw Page per scene — shapes drawn in scene 1 stay on its page,
// switching scenes calls setCurrentPage so each scene has independent
// whiteboard content within a single editor instance.
export const SCENE_PAGE_IDS: Record<SceneId, TLPageId> = {
  1: PageRecordType.createId('scene-1'),
  2: PageRecordType.createId('scene-2'),
  3: PageRecordType.createId('scene-3'),
  4: PageRecordType.createId('scene-4'),
};

const SCENE_PAGE_ID_SET: Set<TLPageId> = new Set(Object.values(SCENE_PAGE_IDS));

export function switchToScenePage(editor: Editor, sceneId: SceneId): void {
  const existing = new Set(editor.getPages().map((p) => p.id));
  for (const id of [1, 2, 3, 4] as SceneId[]) {
    const pageId = SCENE_PAGE_IDS[id];
    if (!existing.has(pageId)) {
      editor.createPage({ id: pageId, name: scenes[id].name });
    }
  }
  editor.setCurrentPage(SCENE_PAGE_IDS[sceneId]);
  // Drop the default page tldraw creates on first mount so the page menu
  // only shows our 4 scenes.
  for (const page of editor.getPages()) {
    if (!SCENE_PAGE_ID_SET.has(page.id)) {
      editor.deletePage(page.id);
    }
  }
}
