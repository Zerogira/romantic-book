import React, { useState, useEffect, useRef } from "react";
import { Heart, Sparkles, BookOpen, Wand2, Check, RotateCcw, Copy, Plus, Trash2, Save } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { defaultStickers, mobileStickers, type StickerItem } from "../../data/stickersConfig";
import { StickerRenderer } from "./StickerRenderer";
import { music } from "../../lib/audio";
import { usePrefersReducedMotion } from "../../lib/motion";
import { useIsMobile } from "../../lib/device";
import { requestFullscreen } from "../../lib/fullscreen";
import { HEART_SHAPE } from "../../lib/hearts";

gsap.registerPlugin(useGSAP);

type Props = {
  onOpen: () => void;
};

// Recursos de edição só existem no servidor de desenvolvimento (npm run dev);
// na versão publicada o visitante não vê nenhum botão de edição.
const CAN_EDIT_PROJECT = import.meta.env.DEV;

// Rascunhos locais separados para computador e celular
const storageKey = (mobile: boolean) =>
  mobile ? "romantic_book_stickers_mobile_v1" : "romantic_book_stickers_v1";

const defaultsFor = (mobile: boolean): StickerItem[] => (mobile ? mobileStickers : defaultStickers);

function loadStickers(mobile: boolean): StickerItem[] {
  if (!CAN_EDIT_PROJECT) return defaultsFor(mobile);
  try {
    const saved = localStorage.getItem(storageKey(mobile));
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Falha ao carregar stickers salvos:", e);
  }
  return defaultsFor(mobile);
}

type SaveStatus = "idle" | "saving" | "saved" | "error";


export function LandingScreen({ onOpen }: Props) {
  const [isOpening, setIsOpening] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  // Celular (tela estreita) usa uma lista de figurinhas própria
  const isMobile = useIsMobile();
  const [stickers, setStickers] = useState<StickerItem[]>(() => loadStickers(isMobile));
  const lastModeRef = useRef(isMobile);

  // Se a janela cruzar o limite computador/celular, troca de lista
  useEffect(() => {
    if (lastModeRef.current === isMobile) return;
    lastModeRef.current = isMobile;
    setStickers(loadStickers(isMobile));
    setSelectedId(null);
    setSaveStatus("idle");
  }, [isMobile]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [assets, setAssets] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { contextSafe } = useGSAP({ scope: containerRef });

  // Controle de arrasto
  const draggingIdRef = useRef<string | null>(null);

  // Pula a abertura: leva a timeline direto ao fim (dispara onComplete)
  const skipIntro = () => {
    timelineRef.current?.progress(1, false);
  };

  // Rascunho local: guarda as edições até serem salvas no projeto
  useEffect(() => {
    if (!isEditMode) return;
    try {
      localStorage.setItem(storageKey(isMobile), JSON.stringify(stickers));
    } catch {}
    // isMobile fica fora das dependências de propósito: ao trocar de modo a lista
    // antiga ainda está em memória e não deve ser gravada no rascunho do outro modo.
  }, [stickers, isEditMode]);

  // Carrega a galeria de figurinhas na primeira vez que ela é aberta
  useEffect(() => {
    if (!galleryOpen || !CAN_EDIT_PROJECT || assets.length > 0) return;
    fetch("/__stickers/assets")
      .then((r) => r.json())
      .then((list: string[]) => setAssets(list))
      .catch((err) => console.warn("Não foi possível listar as figurinhas:", err));
  }, [galleryOpen, assets.length]);

  // Suporte a atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipIntro();
        return;
      }
      if (CAN_EDIT_PROJECT && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsEditMode((prev) => !prev);
        return;
      }
      if (isEditMode && selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    draggingIdRef.current = id;
    setSelectedId(id);
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
  };

  const handleResetPositions = () => {
    setStickers(defaultsFor(isMobile));
    setSelectedId(null);
    setSaveStatus("idle");
    try {
      localStorage.removeItem(storageKey(isMobile));
    } catch {}
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(stickers, null, 2));
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const addSticker = (src: string) => {
    const name = src.split("/").pop() ?? "figurinha";
    const item: StickerItem = {
      id: `img-${Date.now()}`,
      type: "gif",
      label: name,
      x: 50,
      y: 50,
      rotation: 0,
      src,
      scale: 1,
    };
    setStickers((prev) => [...prev, item]);
    setSelectedId(item.id);
    setSaveStatus("idle");
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setStickers((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setSaveStatus("idle");
  };

  const setSelectedScale = (percent: number) => {
    if (!selectedId) return;
    setStickers((prev) =>
      prev.map((item) => (item.id === selectedId ? { ...item, scale: percent / 100 } : item))
    );
    setSaveStatus("idle");
  };

  // Grava src/data/stickers.json pelo servidor de desenvolvimento
  const handleSaveProject = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/__stickers/save${isMobile ? "?target=mobile" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stickers),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus("saved");
      try {
        localStorage.removeItem(storageKey(isMobile));
      } catch {}
    } catch (err) {
      console.error("Falha ao salvar figurinhas:", err);
      setSaveStatus("error");
    }
  };

  // Toque numa figurinha: ela balança e solta corações
  const handleStickerTap = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode || timelineRef.current) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();

    // O balanço vai no filho: a figurinha em si já tem uma animação CSS de flutuar
    const inner = el.firstElementChild;
    if (inner && !reducedMotion) {
      gsap.killTweensOf(inner);
      gsap.fromTo(
        inner,
        { rotation: 0, scale: 1 },
        {
          keyframes: { rotation: [0, -12, 10, -6, 3, 0], scale: [1, 1.15, 1.1, 1.05, 1.02, 1], easeEach: "power1.inOut" },
          duration: 0.7,
        }
      );
    }

    if (!reducedMotion) {
      confetti({
        particleCount: 9,
        spread: 70,
        startVelocity: 16,
        gravity: 0.6,
        ticks: 90,
        scalar: 1.6,
        shapes: [HEART_SHAPE],
        colors: ["#e17b8f", "#f497a9", "#fcd0db"],
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      });
    }
    navigator.vibrate?.(8);
  });

  // Clique do usuário: toca a música (síncrono, dentro do gesto) e roda a abertura
  const handleOpenClick = contextSafe(() => {
    if (timelineRef.current) return;
    // Tudo que depende do toque acontece aqui, de forma síncrona: tela cheia e música
    requestFullscreen();
    music.start();
    setIsOpening(true);

    const root = containerRef.current;
    const card = root?.querySelector(".envelope-card") ?? null;
    const stickersEls = root?.querySelectorAll(".stickers-canvas-layer > *") ?? [];

    const tl = gsap.timeline({ onComplete: () => onOpen() });
    timelineRef.current = tl;

    if (reducedMotion) {
      tl.to(root, { opacity: 0, duration: 0.4, ease: "power1.out" });
      return;
    }

    tl.to(card, { scale: 1.04, duration: 0.2, ease: "power2.out" })
      .to(card, { scale: 0.9, opacity: 0, y: -24, duration: 0.6, ease: "power3.in" })
      .to(stickersEls, { scale: 1.15, opacity: 0, duration: 0.7, stagger: 0.025, ease: "power2.in" }, "<0.1")
      .call(
        () =>
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#e17b8f", "#cce4f8", "#faedd8", "#ffffff"],
          }),
        undefined,
        "-=0.4"
      )
      .to(root, { opacity: 0, duration: 0.5, ease: "power1.out" }, "-=0.2");
  });

  const selectedSticker = stickers.find((item) => item.id === selectedId);

  return (
    <div
      ref={containerRef}
      className={`landing-wrapper ${isEditMode ? "edit-mode-active" : ""}`}
      onPointerDown={() => {
        if (timelineRef.current) skipIntro();
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Luzes e gradientes românticos (rosa, azul pastel e creme) */}
      <div className="landing-ambient ambient-pink" />
      <div className="landing-ambient ambient-blue" />
      <div className="landing-ambient ambient-cream" />

      {/* RENDERIZADOR DE TODAS AS FIGURINHAS (GATINHOS, POLAROIDS, POST-IT, ESTRELAS, GIFs) */}
      <div
        className="stickers-canvas-layer"
        aria-hidden={isOpening}
        onPointerDown={() => {
          if (isEditMode) setSelectedId(null);
        }}
      >
        {stickers.map((stk) => (
          <StickerRenderer
            key={stk.id}
            sticker={stk}
            isEditMode={isEditMode}
            isSelected={stk.id === selectedId}
            onPointerDown={handlePointerDown}
            onTap={handleStickerTap}
          />
        ))}
      </div>

      {/* BOTÃO PARA ATIVAR O MODO EDIÇÃO (somente em desenvolvimento; some na versão publicada) */}
      {CAN_EDIT_PROJECT && (
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
      )}

      {/* GALERIA PARA ESCOLHER UMA FIGURINHA NOVA */}
      <AnimatePresence>
        {isEditMode && galleryOpen && (
          <motion.aside
            key="sticker-gallery"
            className="sticker-gallery"
            aria-label="Galeria de figurinhas"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="gallery-header">
              <span>Escolha uma figurinha</span>
              <button type="button" className="gallery-close" onClick={() => setGalleryOpen(false)} aria-label="Fechar galeria">
                ×
              </button>
            </div>
            {!CAN_EDIT_PROJECT && <p className="gallery-empty">Disponível apenas no modo de desenvolvimento.</p>}
            {CAN_EDIT_PROJECT && assets.length === 0 && (
              <p className="gallery-empty">Nenhuma figurinha em public/images/figurinhas.</p>
            )}
            <div className="gallery-grid">
              {assets.map((src) => (
                <button key={src} type="button" className="gallery-item" onClick={() => addSticker(src)} title={src.split("/").pop()}>
                  <img src={src} alt="" draggable={false} />
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* BARRA FLUTUANTE DE AJUSTES QUANDO ESTIVER NO MODO EDIÇÃO */}
      <AnimatePresence>
      {isEditMode && (
        <motion.aside
          key="edit-toolbar"
          className="edit-toolbar"
          aria-label="Ferramentas de edição"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="toolbar-info">
            <Wand2 size={14} className="toolbar-icon" />
            <span>
              {isMobile
                ? `Editando a lista do celular (${stickers.length})`
                : `Editando a lista do computador (${stickers.length})`}
            </span>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className={`toolbar-btn ${galleryOpen ? "is-on" : ""}`}
              onClick={() => setGalleryOpen((open) => !open)}
              title="Adicionar uma figurinha"
            >
              <Plus size={14} />
              <span>Adicionar</span>
            </button>

            {selectedSticker && (
              <>
                <label className="toolbar-size" title="Tamanho da figurinha selecionada">
                  <span>Tamanho</span>
                  <input
                    type="range"
                    min={40}
                    max={250}
                    step={5}
                    value={Math.round((selectedSticker.scale ?? 1) * 100)}
                    onChange={(e) => setSelectedScale(Number(e.target.value))}
                  />
                </label>
                <button type="button" className="toolbar-btn" onClick={removeSelected} title="Remover figurinha (Delete)">
                  <Trash2 size={14} />
                  <span>Remover</span>
                </button>
              </>
            )}

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

            {CAN_EDIT_PROJECT && (
              <button
                type="button"
                className={`toolbar-btn ${saveStatus === "saved" ? "is-on" : ""}`}
                onClick={handleSaveProject}
                disabled={saveStatus === "saving"}
                title="Grava as figurinhas em src/data/stickers.json"
              >
                <Save size={14} />
                <span>
                  {saveStatus === "saving"
                    ? "Salvando..."
                    : saveStatus === "saved"
                      ? "Salvo no projeto!"
                      : saveStatus === "error"
                        ? "Erro ao salvar"
                        : "Salvar no projeto"}
                </span>
              </button>
            )}

            <button
              type="button"
              className="toolbar-btn btn-save"
              onClick={() => {
                setIsEditMode(false);
                setGalleryOpen(false);
                setSelectedId(null);
              }}
            >
              <Check size={14} />
              <span>Concluir</span>
            </button>
          </div>
        </motion.aside>
      )}
      </AnimatePresence>

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
