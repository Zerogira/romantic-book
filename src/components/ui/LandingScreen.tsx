import React, { useState, useEffect, useRef } from "react";
import { Heart, Sparkles, BookOpen, Wand2, Check, RotateCcw, Copy } from "lucide-react";
import { defaultStickers, type StickerItem } from "../../data/stickersConfig";
import { StickerRenderer } from "./StickerRenderer";

type Props = {
  onOpen: () => void;
};

const STORAGE_KEY = "romantic_book_stickers_v1";

export function LandingScreen({ onOpen }: Props) {
  const [isOpening, setIsOpening] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Falha ao carregar stickers salvos:", e);
    }
    return defaultStickers;
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Controle de arrasto
  const draggingIdRef = useRef<string | null>(null);

  // Suporte a atalho de teclado Ctrl+E para ligar/desligar modo edição
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsEditMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    draggingIdRef.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isEditMode || !draggingIdRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const relativeY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.min(95, Math.max(5, relativeX)));
    const clampedY = Math.round(Math.min(95, Math.max(5, relativeY)));

    setStickers((prev) =>
      prev.map((item) =>
        item.id === draggingIdRef.current ? { ...item, x: clampedX, y: clampedY } : item
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingIdRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    draggingIdRef.current = null;
    // Salva no localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stickers));
    } catch {}
  };

  const handleResetPositions = () => {
    setStickers(defaultStickers);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(stickers, null, 2));
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleOpenClick = () => {
    setIsOpening(true);
    setTimeout(() => {
      onOpen();
    }, 600);
  };

  return (
    <div
      ref={containerRef}
      className={`landing-wrapper ${isOpening ? "is-leaving" : ""} ${isEditMode ? "edit-mode-active" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Luzes e gradientes românticos (rosa, azul pastel e creme) */}
      <div className="landing-ambient ambient-pink" />
      <div className="landing-ambient ambient-blue" />
      <div className="landing-ambient ambient-cream" />

      {/* RENDERIZADOR DE TODAS AS FIGURINHAS (GATINHOS, POLAROIDS, POST-IT, ESTRELAS) */}
      <div className="stickers-canvas-layer" aria-hidden={isOpening}>
        {stickers.map((stk) => (
          <StickerRenderer
            key={stk.id}
            sticker={stk}
            isEditMode={isEditMode}
            onPointerDown={handlePointerDown}
          />
        ))}
      </div>

      {/* BOTÃO DISCRETO PARA ATIVAR O MODO EDIÇÃO */}
      <button
        type="button"
        className={`edit-mode-toggle-btn ${isEditMode ? "is-active" : ""}`}
        onClick={() => setIsEditMode((prev) => !prev)}
        title="Personalizar posição das figurinhas (Ctrl+E)"
        aria-label="Alternar modo de edição de figurinhas"
      >
        <Wand2 size={15} />
        <span>{isEditMode ? "Concluir Edição" : "Editar Figurinhas"}</span>
      </button>

      {/* BARRA FLUTUANTE DE AJUSTES QUANDO ESTIVER NO MODO EDIÇÃO */}
      {isEditMode && (
        <aside className="edit-toolbar" aria-label="Ferramentas de edição">
          <div className="toolbar-info">
            <Wand2 size={14} className="toolbar-icon" />
            <span>Arraste os gatinhos e figurinhas para onde preferir!</span>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="toolbar-btn"
              onClick={handleCopyJSON}
              title="Copiar coordenadas em JSON"
            >
              {copiedFeedback ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedFeedback ? "Copiado!" : "Copiar JSON"}</span>
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onClick={handleResetPositions}
              title="Restaurar posições originais"
            >
              <RotateCcw size={14} />
              <span>Resetar</span>
            </button>

            <button
              type="button"
              className="toolbar-btn btn-save"
              onClick={() => setIsEditMode(false)}
            >
              <Check size={14} />
              <span>Salvar e Fechar</span>
            </button>
          </div>
        </aside>
      )}

      {/* CARTÃO CENTRAL ROMÂNTICO */}
      <div className="envelope-card">
        <div className="card-seal">
          <Heart size={20} fill="#e17b8f" color="#e17b8f" />
        </div>

        <span className="card-kicker">
          <Sparkles size={13} className="sparkle-icon" />
          UM PRESENTE ESPECIAL
          <Sparkles size={13} className="sparkle-icon" />
        </span>

        <h1 className="card-title">
          365 dias <em>de nós</em>
        </h1>

        <p className="card-subtitle">
          Uma pequena história sobre duas pessoas que escolheram caminhar juntas.
        </p>

        <div className="card-divider">
          <span className="line" />
          <Heart size={14} fill="#cbb2a1" color="#cbb2a1" />
          <span className="line" />
        </div>

        <p className="card-dedication">
          “Cada sorriso, cada descoberta e cada instante que nos trouxe até aqui, guardados em um só lugar.”
        </p>

        <button
          type="button"
          className="open-book-btn"
          onClick={handleOpenClick}
          aria-label="Abrir nosso livro"
        >
          <BookOpen size={18} className="btn-icon" />
          <span>Abrir nosso livro</span>
          <Heart size={16} fill="currentColor" className="btn-heart" />
        </button>

        <span className="card-footer-hint">Toque para começar a nossa experiência</span>
      </div>
    </div>
  );
}
