'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Circle,
  Hand,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
} from 'lucide-react';

const tools = [
  { id: 'select', icon: MousePointer2, label: '选择' },
  { id: 'hand', icon: Hand, label: '拖动' },
  { id: 'pen', icon: Pencil, label: '画笔' },
  { id: 'rect', icon: Square, label: '矩形' },
  { id: 'ellipse', icon: Circle, label: '椭圆' },
  { id: 'arrow', icon: ArrowRight, label: '箭头' },
  { id: 'text', icon: Type, label: '文本' },
  { id: 'note', icon: StickyNote, label: '便签' },
];

export function Toolbar() {
  const [active, setActive] = useState('select');

  return (
    <aside
      className="app-toolbar flex flex-col items-center gap-1 py-3"
      style={{
        width: 56,
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {tools.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`tool-btn${active === id ? ' active' : ''}`}
          title={label}
          aria-label={label}
          onClick={() => setActive(id)}
        >
          <Icon size={16} />
        </button>
      ))}
    </aside>
  );
}
