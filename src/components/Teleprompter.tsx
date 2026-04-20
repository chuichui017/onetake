'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mic,
  Minus,
  Palette,
  Settings,
} from 'lucide-react';
import { useStudio } from '@/lib/store';

interface DragState {
  kind: 'move' | 'resize';
  startX: number;
  startY: number;
  origLeft: number;
  origTop: number;
  origW: number;
  origH: number;
}

const WF_COUNT = 12;
const WF_BARS = Array.from({ length: WF_COUNT });

function getVp() {
  if (typeof window === 'undefined') return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function Teleprompter() {
  const telePos = useStudio((s) => s.telePos);
  const teleSize = useStudio((s) => s.teleSize);
  const teleTheme = useStudio((s) => s.teleTheme);
  const teleTransparency = useStudio((s) => s.teleTransparency);
  const teleFontSize = useStudio((s) => s.teleFontSize);
  const teleNotch = useStudio((s) => s.teleNotchMode);
  const telePlaying = useStudio((s) => s.telePlaying);
  const teleSpeed = useStudio((s) => s.teleSpeed);
  const teleText = useStudio((s) => s.teleText);
  const teleCollapsed = useStudio((s) => s.teleCollapsed);
  const voiceSync = useStudio((s) => s.voiceSync);
  const teleprompterVisible = useStudio((s) => s.teleprompterVisible);

  const setTelePos = useStudio((s) => s.setTelePos);
  const setTeleSize = useStudio((s) => s.setTeleSize);
  const toggleVoiceSync = useStudio((s) => s.toggleVoiceSync);
  const cycleTeleTheme = useStudio((s) => s.cycleTeleTheme);
  const bumpTeleFontSize = useStudio((s) => s.bumpTeleFontSize);
  const toggleTeleNotchMode = useStudio((s) => s.toggleTeleNotchMode);
  const toggleTeleCollapsed = useStudio((s) => s.toggleTeleCollapsed);
  const setTeleSpeed = useStudio((s) => s.setTeleSpeed);
  const setTeleText = useStudio((s) => s.setTeleText);

  const [vp, setVp] = useState(getVp);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const offsetRef = useRef(0);
  const textRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const progressLabelRef = useRef<HTMLSpanElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setVp(getVp());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const notchW = Math.min(560, vp.w * 0.62);
  const notchH = 84;
  const width = teleNotch ? notchW : teleSize.w;
  const height = teleNotch ? notchH : teleCollapsed ? 40 : teleSize.h;

  const defaultLeft = Math.max(0, (vp.w - width) / 2);
  const defaultTop = teleNotch ? 0 : 4;

  const left = teleNotch ? defaultLeft : telePos ? telePos.left : defaultLeft;
  const top = teleNotch ? 0 : telePos ? telePos.top : defaultTop;

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (drag.kind === 'move') {
        let nl = drag.origLeft + (e.clientX - drag.startX);
        let nt = drag.origTop + (e.clientY - drag.startY);
        nl = Math.max(0, Math.min(vp.w - width, nl));
        nt = Math.max(0, Math.min(vp.h - height, nt));
        setTelePos({ left: nl, top: nt });
      } else {
        const nw = Math.max(320, drag.origW + (e.clientX - drag.startX));
        const nh = Math.max(120, drag.origH + (e.clientY - drag.startY));
        setTeleSize({
          w: Math.min(vp.w - 20, nw),
          h: Math.min(vp.h - 20, nh),
        });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, vp.w, vp.h, width, height, setTelePos, setTeleSize]);

  useEffect(() => {
    if (!showSettingsPanel) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !popoverRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) {
        setShowSettingsPanel(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSettingsPanel]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (telePlaying && textRef.current) {
        offsetRef.current += (dt / 1000) * 32 * teleSpeed;
        textRef.current.style.transform = `translateY(${-offsetRef.current}px)`;
      }
      if (textRef.current && progressFillRef.current && progressLabelRef.current) {
        const total = Math.max(1, textRef.current.scrollHeight);
        const p = Math.max(0, Math.min(100, (offsetRef.current / total) * 100));
        progressFillRef.current.style.width = p.toFixed(1) + '%';
        progressLabelRef.current.textContent = Math.floor(p) + '%';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [telePlaying, teleSpeed]);

  if (!teleprompterVisible) return null;
  if (teleCollapsed && !teleNotch) return null;

  const stopProp = (e: React.PointerEvent) => e.stopPropagation();

  const onBarDown = (e: React.PointerEvent) => {
    if (teleNotch) return;
    setDrag({
      kind: 'move',
      startX: e.clientX,
      startY: e.clientY,
      origLeft: telePos?.left ?? left,
      origTop: telePos?.top ?? top,
      origW: width,
      origH: height,
    });
  };

  const onResizeDown = (e: React.PointerEvent) => {
    if (teleNotch) return;
    e.stopPropagation();
    setDrag({
      kind: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      origLeft: left,
      origTop: top,
      origW: width,
      origH: height,
    });
  };

  const cls =
    'teleprompter' +
    ` tele-theme-${teleTheme}` +
    ` tele-size-${teleFontSize}` +
    (teleTransparency !== 'normal' ? ` tele-tr-${teleTransparency}` : '') +
    (teleNotch ? ' notch' : '') +
    (teleCollapsed ? ' collapsed' : '') +
    (drag ? ' dragging' : '');

  return (
    <>
    <div className={cls} style={{ left, top, width, height }}>
      <div
        className="teleprompter-bar teleprompter-header"
        onPointerDown={onBarDown}
      >
        <button
          className={`tele-mic${voiceSync ? ' live' : ''}`}
          onPointerDown={stopProp}
          onClick={toggleVoiceSync}
          title={voiceSync ? '停止语音跟随' : '开始语音跟随'}
          aria-label="voice sync"
        >
          {voiceSync ? (
            <span
              style={{
                display: 'inline-block',
                width: 9,
                height: 9,
                borderRadius: 2,
                background: 'currentColor',
              }}
            />
          ) : (
            <Mic size={13} />
          )}
        </button>

        <span
          className={`wf${voiceSync ? ' live' : ''}`}
          aria-hidden
          style={{ marginLeft: 2 }}
        >
          {WF_BARS.map((_, i) => (
            <span key={i} className="wf-bar" />
          ))}
        </span>

        <div className="tele-progress" aria-hidden>
          <div ref={progressFillRef} className="tele-progress-fill" />
        </div>
        <span ref={progressLabelRef} className="tele-progress-label">
          0%
        </span>

        <button
          onPointerDown={stopProp}
          onClick={() => bumpTeleFontSize(-1)}
          title="缩小字号"
          aria-label="smaller"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          A−
        </button>
        <button
          onPointerDown={stopProp}
          onClick={() => bumpTeleFontSize(1)}
          title="放大字号"
          aria-label="bigger"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          A+
        </button>
        <button
          onPointerDown={stopProp}
          onClick={cycleTeleTheme}
          title="切换玻璃主题"
        >
          <Palette size={12} />
        </button>

        <span className="label" style={{ flex: 'initial', marginLeft: 4 }}>
          提词器 · 可拖动
        </span>

        <span style={{ flex: 1 }} />

        <button
          onPointerDown={stopProp}
          onClick={toggleTeleNotchMode}
          title={teleNotch ? '退出贴顶' : '贴顶（刘海下方）'}
        >
          {teleNotch ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
        <button
          onPointerDown={stopProp}
          onClick={toggleTeleCollapsed}
          title="折叠"
        >
          <Minus size={12} />
        </button>
        <button
          ref={btnRef}
          className="tele-settings-btn"
          onPointerDown={stopProp}
          onClick={() => {
            const rect = btnRef.current?.getBoundingClientRect();
            if (rect) {
              setPopoverPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
              });
            }
            setShowSettingsPanel((v) => !v);
          }}
          title="提词器设置"
          aria-label="settings"
        >
          <Settings size={12} />
        </button>
      </div>

      <div className="teleprompter-body">
        <div ref={textRef} className="teleprompter-text">
          {teleText}
        </div>
      </div>

      {!teleNotch && !teleCollapsed && (
        <div className="teleprompter-resize" onPointerDown={onResizeDown} />
      )}
    </div>

    {showSettingsPanel && (
      <div
        ref={popoverRef}
        className="tele-settings-popover"
        style={{ top: popoverPos.top, right: popoverPos.right }}
      >
        <div className="setting-row">
          <span className="setting-label">速度</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={teleSpeed}
            onChange={(e) => setTeleSpeed(Number(e.target.value))}
          />
          <span className="setting-value">×{teleSpeed.toFixed(1)}</span>
        </div>
        <div className="setting-row">
          <label className="vad-toggle">
            <input
              type="checkbox"
              checked={voiceSync}
              onChange={toggleVoiceSync}
            />
            <span>语音同步</span>
            <span className="vad-hint">（说话跟读）</span>
          </label>
        </div>
        <div className="setting-row setting-row-vertical">
          <span className="setting-label">脚本</span>
          <textarea
            value={teleText}
            onChange={(e) => setTeleText(e.target.value)}
            className="script-textarea"
            placeholder="输入提词器内容..."
            rows={4}
          />
        </div>
      </div>
    )}
    </>
  );
}
