import type { WebcamShape, BgSource } from './store';

export type SceneId = 1 | 2 | 3 | 4;

export interface ScenePreset {
  id: SceneId;
  name: string;
  description: string;
  webcamShape: WebcamShape;
  webcamSize: number;
  bgSource: BgSource;
  autoShare: boolean;
}

export const scenes: Record<SceneId, ScenePreset> = {
  1: {
    id: 1,
    name: '讲解',
    description: '圆形头像 · 画板为主',
    webcamShape: 'circle',
    webcamSize: 180,
    bgSource: 'board',
    autoShare: false,
  },
  2: {
    id: 2,
    name: '演示 · 分屏',
    description: '屏幕共享 + 圆形人像',
    webcamShape: 'circle',
    webcamSize: 180,
    bgSource: 'board',
    autoShare: false,
  },
  3: {
    id: 3,
    name: '口播',
    description: '竖屏人像 · 抖音/小红书',
    webcamShape: 'circle',
    webcamSize: 180,
    bgSource: 'board',
    autoShare: false,
  },
  4: {
    id: 4,
    name: '纯板',
    description: '画板为主 · 圆形人像',
    webcamShape: 'circle',
    webcamSize: 180,
    bgSource: 'board',
    autoShare: false,
  },
};

export const sceneOrder: SceneId[] = [1, 2, 3, 4];
