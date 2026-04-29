'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Circle,
  Eraser,
  Hand,
  MousePointer2,
  Palette,
  Pencil,
  Square,
  StickyNote,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import {
  DefaultColorStyle,
  GeoShapeGeoStyle,
  react,
  type Editor,
} from '@tldraw/tldraw';
import { getTldrawEditor, subscribeTldrawEditor } from '@/lib/tldrawEditor';

type LocalToolId =
  | 'select'
  | 'hand'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'note'
  | 'eraser';

type ColorKey = 'black' | 'red' | 'blue' | 'green' | 'orange';

const colorPalette: { key: ColorKey; label: string; hex: string }[] = [
  { key: 'black', label: '黑', hex: '#0F172A' },
  { key: 'red', label: '红', hex: '#EF4444' },
  { key: 'blue', label: '蓝', hex: '#3B82F6' },
  { key: 'green', label: '绿', hex: '#22C55E' },
  { key: 'orange', label: '橙', hex: '#F59E0B' },
];

const tools: { id: LocalToolId; icon: LucideIcon; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: '选择' },
  { id: 'hand', icon: Hand, label: '拖动' },
  { id: 'pen', icon: Pencil, label: '画笔' },
  { id: 'rect', icon: Square, label: '矩形' },
  { id: 'ellipse', icon: Circle, label: '椭圆' },
  { id: 'arrow', icon: ArrowRight, label: '箭头' },
  { id: 'text', icon: Type, label: '文本' },
  { id: 'note', icon: StickyNote, label: '便签' },
];

function applyTool(editor: Editor, id: LocalToolId) {
  switch (id) {
    case 'pen':
      editor.setCurrentTool('draw');
      return;
    case 'rect':
      editor.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle');
      editor.setCurrentTool('geo');
      return;
    case 'ellipse':
      editor.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse');
      editor.setCurrentTool('geo');
      return;
    default:
      editor.setCurrentTool(id);
  }
}

function tldrawToLocal(toolId: string, editor: Editor): LocalToolId | null {
  if (toolId === 'select') return 'select';
  if (toolId === 'hand') return 'hand';
  if (toolId === 'draw') return 'pen';
  if (toolId === 'arrow') return 'arrow';
  if (toolId === 'text') return 'text';
  if (toolId === 'note') return 'note';
  if (toolId === 'eraser') return 'eraser';
  if (toolId === 'geo') {
    const geo = editor.getStyleForNextShape(GeoShapeGeoStyle);
    if (geo === 'ellipse') return 'ellipse';
    return 'rect';
  }
  return null;
}

export function Toolbar() {
  const [active, setActive] = useState<LocalToolId>('select');
  const [colorOpen, setColorOpen] = useState(false);
  const [activeColor, setActiveColor] = useState<ColorKey>('black');
  const colorWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let stopReact: (() => void) | null = null;

    const attach = (editor: Editor | null) => {
      stopReact?.();
      stopReact = null;
      if (!editor) return;
      stopReact = react('toolbar:current-tool', () => {
        const id = editor.getCurrentToolId();
        const local = tldrawToLocal(id, editor);
        if (local) setActive(local);
      });
    };

    attach(getTldrawEditor());
    const unsub = subscribeTldrawEditor(attach);

    return () => {
      stopReact?.();
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!colorOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const wrap = colorWrapRef.current;
      if (wrap && !wrap.contains(e.target as Node)) setColorOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [colorOpen]);

  const onPick = (id: LocalToolId) => {
    setActive(id);
    const editor = getTldrawEditor();
    if (editor) applyTool(editor, id);
  };

  const onUndo = () => {
    const editor = getTldrawEditor();
    editor?.undo();
  };

  const onPickColor = (key: ColorKey) => {
    setActiveColor(key);
    setColorOpen(false);
    const editor = getTldrawEditor();
    if (editor) editor.setStyleForNextShapes(DefaultColorStyle, key);
  };

  const activeSwatch =
    colorPalette.find((c) => c.key === activeColor) ?? colorPalette[0];

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
          onClick={() => onPick(id)}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="tool-divider" />

      <button
        className="tool-btn"
        title="撤销"
        aria-label="撤销"
        onClick={onUndo}
      >
        <Undo2 size={16} />
      </button>

      <button
        className={`tool-btn${active === 'eraser' ? ' active' : ''}`}
        title="橡皮擦"
        aria-label="橡皮擦"
        onClick={() => onPick('eraser')}
      >
        <Eraser size={16} />
      </button>

      <div ref={colorWrapRef} className="tool-color-wrap">
        <button
          className={`tool-btn${colorOpen ? ' active' : ''}`}
          title="颜色"
          aria-label="颜色"
          onClick={() => setColorOpen((v) => !v)}
        >
          <Palette size={16} style={{ color: activeSwatch.hex }} />
        </button>

        {colorOpen && (
          <div className="tool-color-popover" role="menu">
            {colorPalette.map((c) => (
              <button
                key={c.key}
                className={`color-swatch${activeColor === c.key ? ' active' : ''}`}
                title={c.label}
                aria-label={c.label}
                style={{ background: c.hex }}
                onClick={() => onPickColor(c.key)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
