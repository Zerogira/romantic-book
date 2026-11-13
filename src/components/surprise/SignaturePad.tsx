import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Eraser } from "lucide-react";
import "../../styles/surprise.css";

type Props = {
  /** Nome de quem assina (aparece no título). */
  name: string;
  onCancel: () => void;
  /** Recebe a assinatura em PNG (data URL), com fundo transparente e sem as margens vazias. */
  onConfirm: (image: string) => void;
};

type Point = { x: number; y: number };

const INK = "#6a3b4a";
const LINE_WIDTH = 4;
const EXPORT_PADDING = 8; // folga em volta do traço, em px da tela
const MAX_EXPORT_WIDTH = 560; // largura máxima do PNG (mantém o arquivo pequeno)

/**
 * Folha para assinar com o dedo (ou o mouse). Fica num portal (document.body) para não sofrer
 * com os efeitos 3D do livro.
 */
export default function SignaturePad({ name, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const strokeRef = useRef<{ last: Point; mid: Point } | null>(null);
  const boundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Ajusta a resolução do canvas à tela (nítido em telas retina)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    dprRef.current = dpr;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = LINE_WIDTH;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const pointOf = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const grow = (p: Point) => {
    const r = LINE_WIDTH / 2;
    const b = boundsRef.current;
    boundsRef.current = b
      ? { minX: Math.min(b.minX, p.x - r), minY: Math.min(b.minY, p.y - r), maxX: Math.max(b.maxX, p.x + r), maxY: Math.max(b.maxY, p.y + r) }
      : { minX: p.x - r, minY: p.y - r, maxX: p.x + r, maxY: p.y + r };
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    try {
      // Continua desenhando mesmo se o dedo sair um pouco da folha
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // alguns navegadores recusam a captura: o desenho segue normalmente dentro da folha
    }
    const p = pointOf(e);
    strokeRef.current = { last: p, mid: p };
    // Um toque sem arrastar vira um ponto
    ctx.beginPath();
    ctx.arc(p.x, p.y, LINE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
    grow(p);
    setHasInk(true);
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    const ctx = e.currentTarget.getContext("2d");
    if (!stroke || !ctx) return;
    const p = pointOf(e);
    const mid = { x: (stroke.last.x + p.x) / 2, y: (stroke.last.y + p.y) / 2 };
    // Curva suave entre os pontos médios (o traço não fica "quebrado")
    ctx.beginPath();
    ctx.moveTo(stroke.mid.x, stroke.mid.y);
    ctx.quadraticCurveTo(stroke.last.x, stroke.last.y, mid.x, mid.y);
    ctx.stroke();
    strokeRef.current = { last: p, mid };
    grow(p);
  };

  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    const ctx = e.currentTarget.getContext("2d");
    if (stroke && ctx) {
      ctx.beginPath();
      ctx.moveTo(stroke.mid.x, stroke.mid.y);
      ctx.lineTo(stroke.last.x, stroke.last.y);
      ctx.stroke();
    }
    strokeRef.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width / dprRef.current, canvas.height / dprRef.current);
    boundsRef.current = null;
    strokeRef.current = null;
    setHasInk(false);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    const bounds = boundsRef.current;
    if (!canvas || !bounds) return;
    const dpr = dprRef.current;
    // Recorta as margens vazias: a assinatura ocupa todo o espaço onde for mostrada
    const sx = Math.max(0, Math.floor((bounds.minX - EXPORT_PADDING) * dpr));
    const sy = Math.max(0, Math.floor((bounds.minY - EXPORT_PADDING) * dpr));
    const sw = Math.min(canvas.width - sx, Math.ceil((bounds.maxX - bounds.minX + EXPORT_PADDING * 2) * dpr));
    const sh = Math.min(canvas.height - sy, Math.ceil((bounds.maxY - bounds.minY + EXPORT_PADDING * 2) * dpr));
    const ratio = Math.min(1, MAX_EXPORT_WIDTH / sw);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(sw * ratio));
    out.height = Math.max(1, Math.round(sh * ratio));
    out.getContext("2d")?.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
    onConfirm(out.toDataURL("image/png"));
  };

  const sheet = (
    <div className="sig-overlay" role="dialog" aria-modal="true" aria-label={`Assinatura de ${name}`}>
      <div className="sig-sheet">
        <h3 className="sig-title">Assinatura de {name}</h3>
        <p className="sig-hint">Assine com o dedo. Depois de salva, não dá para trocar.</p>

        <div className="sig-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="sig-canvas"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {!hasInk && <span className="sig-placeholder">assine aqui</span>}
        </div>

        <div className="sig-actions">
          <button type="button" className="cam-btn sig-btn" onClick={clear} disabled={!hasInk}>
            <Eraser size={16} /> Limpar
          </button>
          <button type="button" className="cam-btn sig-btn" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="cam-btn cam-btn-primary sig-btn" onClick={confirm} disabled={!hasInk}>
            <Check size={16} /> Assinar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
