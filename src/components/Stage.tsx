import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Orientation = 'landscape' | 'portrait';

export const STAGE = {
  landscape: { w: 1194, h: 834 },
  portrait: { w: 834, h: 1194 },
};

interface StageInfo {
  orientation: Orientation;
  scale: number;
}

const StageContext = createContext<StageInfo>({ orientation: 'landscape', scale: 1 });
export const useStage = () => useContext(StageContext);

function measure(): StageInfo {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const orientation: Orientation = vw >= vh ? 'landscape' : 'portrait';
  const { w, h } = STAGE[orientation];
  return { orientation, scale: Math.min(vw / w, vh / h) };
}

/** The app is laid out on a fixed iPad-sized canvas (1194×834 landscape,
 *  834×1194 portrait) and scaled to fit the screen, so it looks exactly as
 *  designed on any device. */
export function Stage({ background, children }: { background: string; children: ReactNode }) {
  const [info, setInfo] = useState<StageInfo>(measure);

  useEffect(() => {
    const onResize = () => setInfo(measure());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const { w, h } = STAGE[info.orientation];
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
