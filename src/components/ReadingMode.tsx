import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RD } from '../tokens';
import type { Scene, Line } from '../api/types';
import { ReadingScript } from './ReadingScript';

interface Props {
  open: boolean;
  onClose: (lastSceneId: string | null) => void;
  scenes: Array<Scene & { lines: Line[] }>;
  initialSceneId: string | null;
}

const LINES_PER_PAGE = 55;

export function ReadingMode({ open, onClose, scenes, initialSceneId }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(
    initialSceneId,
  );

  // Page math — running line count per scene.
  const pageBySceneId = useMemo(() => {
    const m = new Map<string, number>();
    let running = 0;
    scenes.forEach(s => {
      m.set(s.id, Math.max(1, Math.floor(running / LINES_PER_PAGE) + 1));
      running += s.lines.length + 3;
    });
    return m;
  }, [scenes]);
  const totalPages = useMemo(() => {
    let running = 0;
    scenes.forEach(s => (running += s.lines.length + 3));
    return Math.max(1, Math.ceil(running / LINES_PER_PAGE));
  }, [scenes]);

  const registerScene = useCallback((sid: string, el: HTMLDivElement | null) => {
    if (el) sceneRefs.current.set(sid, el);
    else sceneRefs.current.delete(sid);
  }, []);

  const jumpToScene = useCallback((sid: string, behavior: ScrollBehavior = 'smooth') => {
    const el = sceneRefs.current.get(sid);
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    const top = el.offsetTop - 24;
    scroller.scrollTo({ top, behavior });
    setCurrentSceneId(sid);
  }, []);

  const stepScene = useCallback(
    (dir: 1 | -1) => {
      const idx = scenes.findIndex(s => s.id === currentSceneId);
      const next = Math.max(0, Math.min(scenes.length - 1, idx + dir));
      const sid = scenes[next].id;
      jumpToScene(sid);
    },
    [scenes, currentSceneId, jumpToScene],
  );

  const jumpToPercent = useCallback(
    (pct: number) => {
      if (scenes.length === 0) return;
      const idx = Math.max(
        0,
        Math.min(scenes.length - 1, Math.round(pct * (scenes.length - 1))),
      );
      jumpToScene(scenes[idx].id);
    },
    [scenes, jumpToScene],
  );

  // Open → restore to initial scene (instant scroll, no smooth).
  useEffect(() => {
    if (!open || scenes.length === 0) return;
    const sid = initialSceneId && sceneRefs.current.has(initialSceneId)
      ? initialSceneId
      : scenes[0].id;
    // Defer so refs are wired.
    const t = setTimeout(() => jumpToScene(sid, 'auto'), 0);
    return () => clearTimeout(t);
  }, [open, initialSceneId, scenes, jumpToScene]);

  // Track scroll → current scene (whichever heading is closest to top).
  useEffect(() => {
    if (!open) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => {
      let best: { sid: string; dist: number } | null = null;
      sceneRefs.current.forEach((el, sid) => {
        const top = el.offsetTop - scroller.scrollTop;
        const dist = Math.abs(top - 80);
        if (best === null || dist < best.dist) best = { sid, dist };
      });
      if (best) setCurrentSceneId((best as { sid: string; dist: number }).sid);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [open]);

  // Keyboard nav (only while open). Reading mode is the top consumer; we
  // stopPropagation so nothing else (right-click menus, agent shortcuts)
  // fires beneath the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(currentSceneId);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepScene(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepScene(-1);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        if (scenes.length > 0) jumpToScene(scenes[0].id);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        if (scenes.length > 0) jumpToScene(scenes[scenes.length - 1].id);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const delta = scroller.clientHeight - 80;
        scroller.scrollBy({ top: e.shiftKey ? -delta : delta, behavior: 'smooth' });
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        jumpToPercent(parseInt(e.key, 10) / 10);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, stepScene, jumpToScene, jumpToPercent, scenes, currentSceneId]);

  if (!open) return null;

  const page = currentSceneId
    ? pageBySceneId.get(currentSceneId) ?? 1
    : 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: RD.ink,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: '40px 0 60px',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Top-right hint */}
      <div
        className="rd-reading-print-hide"
        style={{
          position: 'absolute',
          top: 20,
          right: 28,
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 11,
          color: 'rgba(244,237,224,0.4)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        esc to return
      </div>

      {/* Paper scroller */}
      <div
        ref={scrollerRef}
        className="rd-reading-scroll"
        style={{
          overflow: 'auto',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="rd-reading-paper"
          style={{
            background: '#fefcf2',
            color: RD.ink,
            width: 'min(92vw, 600px)',
            minHeight: 'min(85vh, 880px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
            padding: '36px 56px',
            margin: '0 16px',
          }}
        >
          <ReadingScript scenes={scenes} registerScene={registerScene} />
        </div>
      </div>

      {/* Bottom hint */}
      <div
        className="rd-reading-print-hide"
        style={{
          position: 'absolute',
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: RD.display,
          fontStyle: 'italic',
          fontSize: 11,
          color: 'rgba(244,237,224,0.4)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        p. {page} of {totalPages} · ← scene → · space to page
      </div>
    </div>
  );
}
