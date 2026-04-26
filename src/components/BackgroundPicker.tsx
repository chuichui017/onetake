'use client';

import { useEffect } from 'react';
import {
  useStudio,
  type BackgroundType,
  type BackgroundPattern,
} from '@/lib/store';

const PRESET_SOLIDS: { name: string; value: string }[] = [
  { name: '暖砂', value: '#E8DDC8' },
  { name: '雾灰', value: '#E4E4E7' },
  { name: '蜜蜡', value: '#FDE68A' },
  { name: '玫瑰', value: '#FDA4AF' },
  { name: '薰衣', value: '#C4B5FD' },
  { name: '青竹', value: '#86EFAC' },
  { name: '海军', value: '#1E293B' },
  { name: '墨', value: '#18181B' },
];

const PRESET_GRADIENTS: {
  name: string;
  value: string;
  lightText: boolean;
}[] = [
  {
    name: '日出',
    value: 'linear-gradient(135deg, #FCE7F3 0%, #FDE68A 100%)',
    lightText: true,
  },
  {
    name: '薄雾',
    value: 'linear-gradient(135deg, #E0E7FF 0%, #F5F3FF 100%)',
    lightText: true,
  },
  {
    name: '晨光',
    value: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
    lightText: true,
  },
  {
    name: '晚霞',
    value:
      'linear-gradient(135deg, #FECACA 0%, #FDE68A 50%, #DDD6FE 100%)',
    lightText: true,
  },
  {
    name: '北极',
    value: 'linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 100%)',
    lightText: true,
  },
  {
    name: '森林',
    value: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
    lightText: true,
  },
  {
    name: '深夜',
    value: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
    lightText: false,
  },
  {
    name: '极光',
    value:
      'linear-gradient(135deg, #818CF8 0%, #C084FC 50%, #F472B6 100%)',
    lightText: false,
  },
];

const PATTERNS: {
  id: BackgroundPattern;
  label: string;
  preview: (color: string) => React.CSSProperties;
}[] = [
  {
    id: 'dots',
    label: '圆点',
    preview: (c) => ({
      backgroundImage: `radial-gradient(circle, ${c} 1px, transparent 1px)`,
      backgroundSize: '20px 20px',
    }),
  },
  {
    id: 'grid',
    label: '网格',
    preview: (c) => ({
      backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
      backgroundSize: '24px 24px',
    }),
  },
  {
    id: 'diagonal',
    label: '斜线',
    preview: (c) => ({
      backgroundImage: `repeating-linear-gradient(45deg, transparent 0 8px, ${c} 8px 9px)`,
    }),
  },
  {
    id: 'cross',
    label: '十字',
    preview: (c) => ({
      backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
      backgroundPosition: 'center center',
    }),
  },
];

const PATTERN_COLORS = ['#71717A', '#09090B', '#FFFFFF', '#3B82F6', '#7C3AED', '#EC4899'];
const PATTERN_BASES = ['#FAFAFA', '#FFFFFF', '#18181B', '#0F172A'];

export const STAGE_COLOR_PRESETS: { name: string; value: string }[] = [
  { name: '纯白', value: '#FFFFFF' },
  { name: '暖米', value: '#FAF8F3' },
  { name: '雾灰', value: '#F5F5F7' },
  { name: '浅蓝', value: '#F0F7FF' },
  { name: '樱粉', value: '#FEF2F5' },
  { name: '薄荷', value: '#F0FDF4' },
];

const DEFAULT_SOLID = '#F5F0E8';
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #FCE7F3 0%, #FDE68A 100%)';

const TABS: { v: Exclude<BackgroundType, 'default' | 'blur'>; label: string }[] = [
  { v: 'solid', label: '纯色' },
  { v: 'gradient', label: '渐变' },
  { v: 'pattern', label: '图案' },
];

export function BackgroundPicker() {
  const bg = useStudio((s) => s.background);
  const customGradient = useStudio((s) => s.customGradient);
  const setBackground = useStudio((s) => s.setBackground);
  const setCustomGradient = useStudio((s) => s.setCustomGradient);

  useEffect(() => {
    if (bg.type === 'blur') setBackground({ type: 'default' });
  }, [bg.type, setBackground]);

  const selectTab = (next: Exclude<BackgroundType, 'default' | 'blur'>) => {
    if (next === 'solid') {
      setBackground({ type: 'solid', value: bg.value || DEFAULT_SOLID });
    } else if (next === 'gradient') {
      setBackground({ type: 'gradient', value: bg.value || DEFAULT_GRADIENT });
    } else {
      setBackground({ type: 'pattern' });
    }
  };

  // 默认 tab = 'solid'：当 bg.type 是 'default' 或 'blur' 时仍把"纯色"标为激活
  const tab: Exclude<BackgroundType, 'default' | 'blur'> =
    bg.type === 'default' || bg.type === 'blur' ? 'solid' : bg.type;

  return (
    <div className="bg-picker">
      <div className="bg-tabs">
        {TABS.map((t) => (
          <button
            key={t.v}
            type="button"
            className={`bg-tab${tab === t.v ? ' active' : ''}`}
            onClick={() => selectTab(t.v)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'solid' && (
        <>
          <div className="swatch-row">
            {PRESET_SOLIDS.map((c) => {
              const active = bg.type === 'solid' && bg.value === c.value;
              return (
                <button
                  key={c.value}
                  className={`swatch${active ? ' swatch-active' : ''}`}
                  title={c.name}
                  style={{ background: c.value }}
                  onClick={() =>
                    setBackground({ type: 'solid', value: c.value })
                  }
                />
              );
            })}
          </div>
          <div className="custom-picker">
            <input
              type="color"
              value={bg.value || '#FFFFFF'}
              onChange={(e) =>
                setBackground({ type: 'solid', value: e.target.value })
              }
              className="picker-dot"
            />
            <input
              type="text"
              value={(bg.value || '').toUpperCase()}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(v))
                  setBackground({ type: 'solid', value: v });
              }}
              className="hex-field"
              placeholder="#FFFFFF"
              maxLength={7}
            />
          </div>
        </>
      )}

      {tab === 'gradient' && (
        <>
          <div className="gradient-preset-grid">
            {PRESET_GRADIENTS.map((g) => {
              const active = bg.type === 'gradient' && bg.value === g.value;
              return (
                <button
                  key={g.name}
                  className={`gradient-preset-card${active ? ' active' : ''}${
                    g.lightText ? ' light-text' : ''
                  }`}
                  title={g.name}
                  style={{ background: g.value }}
                  onClick={() =>
                    setBackground({ type: 'gradient', value: g.value })
                  }
                >
                  <span className="gradient-preset-name">{g.name}</span>
                </button>
              );
            })}
          </div>

          <div className="gradient-custom">
            <div className="gradient-picker-pair">
              <label className="gradient-stop-btn" title="起始色">
                <span
                  className="stop-dot"
                  style={{ background: customGradient.start }}
                />
                <input
                  type="color"
                  className="stop-hidden-input"
                  value={customGradient.start}
                  onChange={(e) =>
                    setCustomGradient({ start: e.target.value })
                  }
                />
              </label>

              <div className="gradient-arrow" aria-hidden>
                →
              </div>

              <label className="gradient-stop-btn" title="终止色">
                <span
                  className="stop-dot"
                  style={{ background: customGradient.end }}
                />
                <input
                  type="color"
                  className="stop-hidden-input"
                  value={customGradient.end}
                  onChange={(e) =>
                    setCustomGradient({ end: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="gradient-angle">
              <input
                type="range"
                min={0}
                max={360}
                value={customGradient.angle}
                onChange={(e) =>
                  setCustomGradient({ angle: Number(e.target.value) })
                }
                className="angle-slider"
              />
              <span className="angle-value">{customGradient.angle}°</span>
            </div>
          </div>
        </>
      )}

      {tab === 'pattern' && (
        <div className="bg-pattern-group">
          <div className="bg-patterns">
            {PATTERNS.map((p) => {
              const active = bg.type === 'pattern' && bg.pattern === p.id;
              return (
                <button
                  key={p.id}
                  className={`bg-pattern-card${active ? ' active' : ''}`}
                  title={p.label}
                  onClick={() =>
                    setBackground({
                      type: 'pattern',
                      pattern: p.id,
                      value: p.id,
                    })
                  }
                >
                  <span
                    className="bg-pattern-preview"
                    style={{
                      color: bg.patternColor,
                      background: bg.patternBase,
                      opacity: 1,
                      ...p.preview(bg.patternColor),
                    }}
                  />
                  <span className="bg-pattern-label">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-row">
            <label className="bg-row-label">图案颜色</label>
            <div className="swatch-row">
              {PATTERN_COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch${
                    bg.patternColor === c ? ' swatch-active' : ''
                  }`}
                  style={{ background: c }}
                  onClick={() => setBackground({ patternColor: c })}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="bg-row">
            <label className="bg-row-label">
              透明度 · {bg.patternOpacity.toFixed(1)}
            </label>
            <input
              type="range"
              className="slider"
              min={0.1}
              max={1}
              step={0.05}
              value={bg.patternOpacity}
              onChange={(e) =>
                setBackground({ patternOpacity: Number(e.target.value) })
              }
            />
          </div>

          <div className="bg-row">
            <label className="bg-row-label">底色</label>
            <div className="swatch-row swatch-row-base">
              {PATTERN_BASES.map((c) => (
                <button
                  key={c}
                  className={`swatch${
                    bg.patternBase === c ? ' swatch-active' : ''
                  }`}
                  style={{ background: c }}
                  onClick={() => setBackground({ patternBase: c })}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
