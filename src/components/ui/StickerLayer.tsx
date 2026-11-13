import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StickerItem } from "../../data/stickersConfig";
import { stickerEdit, type StickerScope } from "../../lib/stickerEdit";
import { StickerRenderer } from "./StickerRenderer";

type Props = {
  scope: StickerScope;
  pageId: string;
  stickers: StickerItem[];
  /** true só para a página em edição (modo edição do desenvolvimento): aí as figurinhas podem ser arrastadas. */
  editable: boolean;
  selectedId: string | null;
  /**
   * Largura de referência (px) para figurinhas dentro da página: elas crescem e encolhem junto com a
   * página, mantendo a mesma proporção em qualquer tela. Sem isso, o tamanho é o natural (em px).
   */
  baseWidth?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Camada de figurinhas. Fora do modo edição ela é só decoração: não recebe toques, então
 * clicar "em cima" da figurinha vira a página normalmente.
 */
export function StickerLayer({ scope, pageId, stickers, editable, selectedId, baseWidth }: Props) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = layerRef.current;
    if (!baseWidth || !el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [baseWidth, stickers.length > 0 || editable]);

  // O livro vira a página ao apertar o mouse/dedo dentro dele. Ao editar, apertar numa figurinha
  // deve só arrastá-la: interrompe esses eventos antes de chegarem ao livro.
  useEffect(() => {
    const el = layerRef.current;
    if (!editable || !el) return;
    const stop = (event: Event) => {
      if ((event.target as HTMLElement).closest(".sticker-item")) event.stopPropagation();
    };
    const types = ["mousedown", "touchstart"] as const;
    types.forEach((type) => el.addEventListener(type, stop));
    return () => types.forEach((type) => el.removeEventListener(type, stop));
  }, [editable, stickers.length > 0]);

  const startDrag = (event: ReactPointerEvent, id: string) => {
    if (!editable) return;
    const layer = layerRef.current;
    const item = stickers.find((s) => s.id === id);
    if (!layer || !item) return;
    event.preventDefault();
    event.stopPropagation();
    stickerEdit.select(scope, id);

    const rect = layer.getBoundingClientRect();
    const origin = { px: event.clientX, py: event.clientY, x: item.x, y: item.y };
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const move = (ev: PointerEvent) => {
      const x = round(clamp(origin.x + ((ev.clientX - origin.px) / rect.width) * 100, 0, 100));
      const y = round(clamp(origin.y + ((ev.clientY - origin.py) / rect.height) * 100, 0, 100));
      stickerEdit.setList(
        pageId,
        scope,
        stickers.map((s) => (s.id === id ? { ...s, x, y } : s))
      );
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  if (stickers.length === 0 && !editable) return null;

  const scale = baseWidth && size.w ? size.w / baseWidth : 1;
  const stageStyle = baseWidth
    ? { width: baseWidth, height: size.h && scale ? size.h / scale : "100%", transform: `scale(${scale})`, transformOrigin: "0 0" }
    : undefined;

  return (
    <div
      ref={layerRef}
      className={`sticker-layer sticker-layer-${scope} ${editable ? "is-editable" : ""}`}
      aria-hidden="true"
    >
      <div className="sticker-stage" style={stageStyle}>
        {stickers.map((sticker) => (
          <StickerRenderer
            key={sticker.id}
            sticker={sticker}
            isEditMode={editable}
            isSelected={editable && selectedId === sticker.id}
            onPointerDown={startDrag}
          />
        ))}
      </div>
    </div>
  );
}
