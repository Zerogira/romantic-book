import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

type OpenFn = (src: string, alt?: string) => void;

const LightboxContext = createContext<OpenFn>(() => {});

/** Abre uma foto ampliada (com zoom por pinça, toque duplo e arrastar). */
export function useLightbox(): OpenFn {
  return useContext(LightboxContext);
}

type View = { scale: number; x: number; y: number };
const MIN_SCALE = 1;
const MAX_SCALE = 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ distance: 0, scale: 1 });
  const pan = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  const moved = useRef(false);

  const apply = (next: View) => {
    // Sem zoom, a imagem sempre volta ao centro
    setView(next.scale <= MIN_SCALE ? { scale: MIN_SCALE, x: 0, y: 0 } : next);
  };

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // alguns navegadores recusam a captura; o gesto continua funcionando sem ela
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      pinch.current = { distance: distance(), scale: viewRef.current.scale };
    } else {
      pan.current = { x: viewRef.current.x, y: viewRef.current.y, startX: e.clientX, startY: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current.distance > 0) {
      moved.current = true;
      const scale = clamp((pinch.current.scale * distance()) / pinch.current.distance, MIN_SCALE, MAX_SCALE);
      setView((v) => ({ ...v, scale }));
    } else if (pointers.current.size === 1 && viewRef.current.scale > MIN_SCALE) {
      const dx = e.clientX - pan.current.startX;
      const dy = e.clientY - pan.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      setView((v) => ({ ...v, x: pan.current.x + dx, y: pan.current.y + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      // Soltou um dedo da pinça: o outro continua arrastando
      const [rest] = [...pointers.current.values()];
      pan.current = { x: viewRef.current.x, y: viewRef.current.y, startX: rest.x, startY: rest.y };
    }
    if (pointers.current.size > 0) return;

    if (viewRef.current.scale < 1.05) apply({ scale: 1, x: 0, y: 0 });

    // Toque duplo: alterna entre 1x e 2,5x
    if (!moved.current) {
      const now = Date.now();
      const last = lastTap.current;
      if (now - last.time < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
        apply(viewRef.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 });
        lastTap.current = { time: 0, x: 0, y: 0 };
      } else {
        lastTap.current = { time: now, x: e.clientX, y: e.clientY };
      }
    }
  };

  // Roda do mouse (computador)
  const onWheel = (e: React.WheelEvent) => {
    const scale = clamp(viewRef.current.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_SCALE, MAX_SCALE);
    apply({ ...viewRef.current, scale });
  };

  return (
    <div
      className="lightbox-stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <img
        className="lightbox-image"
        src={src}
        alt={alt}
        draggable={false}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transition: pointers.current.size === 0 ? "transform 0.2s ease-out" : "none",
        }}
      />
    </div>
  );
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);

  const open = useCallback<OpenFn>((src, alt = "Foto ampliada") => setImage({ src, alt }), []);
  const close = useCallback(() => setImage(null), []);
  const value = useMemo(() => open, [open]);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [image, close]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {image && (
          <motion.div
            key="lightbox"
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ZoomableImage src={image.src} alt={image.alt} />
            <button type="button" className="lightbox-close" onClick={close} aria-label="Fechar foto">
              <X size={20} />
            </button>
            <span className="lightbox-hint">Use dois dedos para ampliar</span>
          </motion.div>
        )}
      </AnimatePresence>
    </LightboxContext.Provider>
  );
}
