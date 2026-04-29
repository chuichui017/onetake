// 录制管线需要读取多个 DOM 元素的 boundingRect 来计算合成布局。
// 之前是 store.ts 里直接 document.querySelector('.stage-shell') 等——
// 把选择器藏在 store 降低可测性，组件改 className 会静默失败。
// 改为：组件在 mount 时注册 ref；store 调用 getRecordingRefs() 取。

export interface RecordingRefs {
  stageShell: HTMLElement | null;
  webcamLayer: HTMLElement | null;
  webcamVideo: HTMLVideoElement | null;
  videoCard: HTMLElement | null;
  uploadedVideo: HTMLVideoElement | null;
  screenWrap: HTMLElement | null;
}

const refs: RecordingRefs = {
  stageShell: null,
  webcamLayer: null,
  webcamVideo: null,
  videoCard: null,
  uploadedVideo: null,
  screenWrap: null,
};

export function setRecordingRef<K extends keyof RecordingRefs>(
  key: K,
  el: RecordingRefs[K]
): void {
  refs[key] = el;
}

export function getRecordingRefs(): Readonly<RecordingRefs> {
  return refs;
}
