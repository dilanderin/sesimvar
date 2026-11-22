import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Orientation = 'landscape' | 'portrait';

export const STAGE = {
  landscape: { w: 1194, h: 834 },
  portrait: { w: 834, h: 1194 },
};

/** Phones get their own compact layouts on a canvas that fills the screen:
 *  upright it is PHONE.w wide, sideways PHONE.h tall; the other side follows
 *  the screen's shape. */
export const PHONE = { w: 400, h: 400 };

export interface StageInfo {
  orientation: Orientation;
  /** A phone-sized screen (shortest side under 600 CSS px). */
  phone: boolean;
  scale: number;
  /** Canvas size in stage pixels. */
  w: number;
  h: number;
}

const StageContext = createContext<StageInfo>({ orientation: 'landscape', phone: false, scale: 1, ...STAGE.landscape });
export const useStage = () => useContext(StageContext);

export function measureStage(vw: number, vh: number): StageInfo {
  const orientation: Orientation = vw >= vh ? 'landscape' : 'portrait';
  if (Math.min(vw, vh) < 600) {
    const scale = orientation === 'portrait' ? vw / PHONE.w : vh / PHONE.h;
    return { orientation, phone: true, scale, w: Math.round(vw / scale), h: Math.round(vh / scale) };
  }
  const { w, h } = STAGE[orientation];
  return { orientation, phone: false, scale: Math.min(vw / w, vh / h), w, h };
}

type Insets = { top: number; right: number; bottom: number; left: number };
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The notch and home bar areas (the app runs edge to edge: viewport-fit=cover). */
function safeArea(): Insets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  const r = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  probe.remove();
  return r;
}

/** Phones keep clear of the notch and home bar; iPad keeps its exact design. */
function measure(): StageInfo & { insets: Insets } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (Math.min(vw, vh) >= 600) return { ...measureStage(vw, vh), insets: NO_INSETS };
  const insets = safeArea();
  const info = measureStage(vw - insets.left - insets.right, vh - insets.top - insets.bottom);
  return { ...info, phone: true, insets };
}

/** On iPad the app is laid out on a fixed canvas (1194×834 landscape,
 *  834×1194 portrait) and scaled to fit the screen, so it looks exactly as
 *  designed. Phones use a canvas shaped like the screen (see PHONE). */
export function Stage({ background, children }: { background: string; children: ReactNode }) {
  const [info, setInfo] = useState(measure);

  useEffect(() => {
    const onResize = () => setInfo(measure());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const { w, h } = info;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: `${info.insets.top}px ${info.insets.right}px ${info.insets.bottom}px ${info.insets.left}px`,
      }}
    >
      <StageContext.Provider value={info}>
        <div
          id="stage"
          style={{
            width: w,
            height: h,
            flex: 'none',
            transform: `scale(${info.scale})`,
            transformOrigin: 'center center',
            position: 'relative',
          }}
        >
          {children}
        </div>
      </StageContext.Provider>
    </div>
  );
}

/** Convert a DOM rect to stage coordinates (undoing the fit scale). */
export function toStageRect(el: Element, scale: number) {
  const stage = document.getElementById('stage');
  const s = stage!.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: (r.left - s.left) / scale,
    y: (r.top - s.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
  };
}
