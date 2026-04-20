'use client';

import { useStudio } from '@/lib/store';
import { sceneOrder, scenes, type SceneId } from '@/lib/scenes';

interface ScenesBarProps {
  onRequestScreen: () => void | Promise<void>;
}

export function ScenesBar({ onRequestScreen }: ScenesBarProps) {
  const scene = useStudio((s) => s.scene);
  const setScene = useStudio((s) => s.setScene);

  const pick = (id: SceneId) => {
    setScene(id);
    if (scenes[id].autoShare) {
      void onRequestScreen();
    }
  };

  return (
    <div className="bottom-bar">
      <div className="scenes-bar">
        {sceneOrder.map((id) => {
          const s = scenes[id];
          const active = scene === id;
          return (
            <button
              key={id}
              className={`scene-btn${active ? ' active' : ''}`}
              onClick={() => pick(id)}
              title={s.description}
            >
              <span>{s.name}</span>
              <span className="key">{id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
