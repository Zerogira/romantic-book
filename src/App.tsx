import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Heart, Maximize2, Music2, VolumeX, X } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import { MotionConfig, motion } from "motion/react";
import type { PageData } from "./data/bookContent";
import { bookPages } from "./data/bookContent";
import { BookPage, ActivePageContext } from "./components/book/BookPage";
import { BookCamera } from "./components/book/BookCamera";
import { CoverPage } from "./components/book/CoverPage";
import { BackCover } from "./components/book/BackCover";
import { LandingScreen } from "./components/ui/LandingScreen";
import { RegistroProvider } from "./components/registro/RegistroProvider";
import { LightboxProvider } from "./components/ui/Lightbox";
import { CartaProvider } from "./components/carta/CartaProvider";
import { InstallApp } from "./components/ui/InstallApp";
import { music, sfx, MUSIC_SRC } from "./lib/audio";
import { useIsMobile } from "./lib/device";
import { usePrefersReducedMotion } from "./lib/motion";
import { requestFullscreen, exitFullscreen } from "./lib/fullscreen";
import "./styles/book.css";

// Editor de páginas: existe apenas no servidor de desenvolvimento
const PageEditor = import.meta.env.DEV
  ? lazy(() => import("./components/dev/PageEditor").then((m) => ({ default: m.PageEditor })))
  : null;

type FlipBookHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    turnToPage: (page: number) => void;
    getCurrentPageIndex: () => number;
    getSettings?: () => { flippingTime: number };
  };
};

function MusicToggle() {
  const [muted, setMuted] = useState(() => music.isMuted());
  const available = music.isAvailable();
  const playing = available && !muted;

  const toggle = () => {
    if (muted) {
      // Clique do usuário: pode iniciar o áudio com segurança
      music.setMuted(false);
      setMuted(false);
      music.start();
    } else {
      music.setMuted(true);
      setMuted(true);
    }
  };

  return (
    <button
      type="button"
      className={`music-toggle ${playing ? "is-active" : ""}`}
      onClick={toggle}
      title={available ? "Ligar ou pausar a música" : `Coloque o arquivo em ${MUSIC_SRC}`}
      aria-label="Alternar música"
    >
      {playing ? <Music2 size={15} /> : <VolumeX size={15} />}
      <span>
        {!available ? "Música em breve" : muted ? "Música pausada" : "Música ligada"}
      </span>
    </button>
  );
}

export default function App() {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  // O livro é montado (escondido) logo depois da tela inicial aparecer, em um momento ocioso.
  // Assim o trabalho pesado de montar as páginas já está feito quando ela toca em "Abrir".
  const [bookMounted, setBookMounted] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [spread, setSpread] = useState(false); // true quando o livro mostra duas páginas lado a lado
  const activePageValue = useMemo(() => ({ index: activePage, spread }), [activePage, spread]);
  const [editingPages, setEditingPages] = useState(false);
  const [reader, setReader] = useState(false); // modo leitura (celular): livro maior, sem cabeçalho
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion(); // mesma regra do resto do site (e do ?motion=1 em testes)
  const bookRef = useRef<FlipBookHandle | null>(null);
  const showBook = bookMounted || isBookOpen;

  // Páginas estáveis memoizadas
  const renderedPages = useMemo(
    () => [
      <CoverPage key="page-cover" />,
      ...bookPages.map((page: PageData, index: number) => (
        // +1 porque a capa é a página 0
        <BookPage key={page.id} page={page} pageIndex={index + 1} />
      )),
      <BackCover key="page-back-cover" />,
    ],
    []
  );
  const lastIndex = renderedPages.length - 1;

  // ---- Montagem antecipada do livro ----
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const start = () => setBookMounted(true);
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(start, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(start, 800);
    return () => window.clearTimeout(timer);
  }, []);

  // ---- Tamanho da tela ----
  // Altura máxima do livro acompanha a tela (sem rolagem): cabeçalho e rodapé ocupam ~250px
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // No celular a barra do navegador some e volta enquanto se toca na tela, mudando a altura.
        // Ignora essas variações pequenas: reconfigurar o livro no meio de um gesto trava a tela.
        setViewport((prev) => (Math.abs(w - prev.w) < 12 && Math.abs(h - prev.h) < 90 ? prev : { w, h }));
      }, 250);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  const viewportHeight = viewport.h;
  // No modo leitura o livro ocupa quase toda a tela e pode ficar mais alto que o padrão
  const bookMaxHeight = reader ? Math.max(400, viewportHeight - 16) : Math.max(400, Math.round(viewportHeight - 250));
  const readerRatio = Math.min(1.75, Math.max(1.38, (viewportHeight - 16) / viewport.w));
  const bookWidthProp = 500;
  const bookHeightProp = reader ? Math.round(bookWidthProp * readerRatio) : 690;

  // ---- Modo leitura ----
  // Só muda o layout; a tela cheia é controlada pela experiência inteira
  const enterReader = () => {
    requestFullscreen();
    setReader(true);
  };
  const exitReader = () => setReader(false);

  // Sai do modo leitura ao voltar para a tela inicial ou ao sair do celular (ex.: girar para computador)
  useEffect(() => {
    if (!isBookOpen || !isMobile) setReader(false);
  }, [isBookOpen, isMobile]);

  // ---- Livro fechado: centraliza e "fecha" ----
  // Com duas páginas visíveis, a capa fica na metade direita e a contracapa na esquerda.
  // Deslocamos o livro meia página para o centro, como um livro fechado sobre a mesa.
  const shiftRef = useRef<HTMLDivElement | null>(null);
  const [shiftPx, setShiftPx] = useState(0);
  const [rewinding, setRewinding] = useState(false); // true enquanto o livro folheia de volta até a capa
  const rewindingRef = useRef(false);
  const rewindTimersRef = useRef<number[]>([]);
  const spreadRef = useRef(false);
  const indexRef = useRef(0);
  const lastFlipRef = useRef(0); // quando o livro começou a virar sozinho (para o gesto de reserva)

  const applyShift = useCallback(() => {
    const parent = shiftRef.current?.querySelector(".stf__parent") as HTMLElement | null;
    const fullWidth = parent?.offsetWidth ?? 0; // offsetWidth não muda com a câmera/animações
    const index = indexRef.current;
    const atCover = index === 0;
    const atBack = index === lastIndex;
    setShiftPx(spreadRef.current ? (atCover ? -fullWidth / 4 : atBack ? fullWidth / 4 : 0) : 0);
  }, [lastIndex]);

  // ---- Fim do livro: folheia rápido de volta até a capa (livro fechado) ----
  const clearRewindTimers = () => {
    rewindTimersRef.current.forEach((id) => window.clearTimeout(id));
    rewindTimersRef.current = [];
  };

  const startRewind = () => {
    const flip = bookRef.current?.pageFlip();
    if (!flip || indexRef.current !== lastIndex) return; // ela já saiu da contracapa
    rewindingRef.current = true;
    setRewinding(true);
    sfx.riffle();

    // Viradas curtas e seguidas. Cada nova virada encerra a anterior na hora, o que dá o efeito de folhear.
    const settings = flip.getSettings?.();
    const originalTime = settings?.flippingTime;
    if (settings) settings.flippingTime = 260;

    const finish = () => {
      clearRewindTimers();
      if (settings && originalTime !== undefined) settings.flippingTime = originalTime;
      rewindingRef.current = false;
      setRewinding(false);
      sfx.close(); // batida suave do livro se fechando
    };

    let guard = 0;
    const step = () => {
      let index = 0;
      try {
        index = flip.getCurrentPageIndex();
      } catch {
        finish();
        return;
      }
      if (index <= 0 || guard++ > 25) {
        // Chegou na capa (ou limite de segurança): deixa a última virada terminar
        rewindTimersRef.current.push(window.setTimeout(finish, 500));
        return;
      }
      flip.flipPrev();
      rewindTimersRef.current.push(window.setTimeout(step, 150));
    };
    step();
  };

  const handleFlip = (e: { data: number }) => {
    indexRef.current = e.data;
    setActivePage(e.data);
    applyShift();
    // Chegou na contracapa: depois de um instante para ver, o livro se fecha folheando de volta à capa
    if (e.data === lastIndex && !rewindingRef.current) {
      clearRewindTimers();
      rewindTimersRef.current.push(window.setTimeout(startRewind, 1100));
    }
  };

  const handleOrientation = (e: { data: { mode: string } }) => {
    const isSpread = e.data.mode === "landscape";
    spreadRef.current = isSpread;
    setSpread(isSpread);
    applyShift();
  };

  // ---- Gesto de arrastar (reserva) ----
  // O livro já vira com um deslize rápido, mas deslizes mais lentos, e principalmente o
  // da esquerda para a direita (voltar), nem sempre eram reconhecidos no celular.
  // Se o livro não virou sozinho, viramos a página por aqui.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as Node;
    if (e.touches.length !== 1 || !containerRef.current?.contains(target)) {
      touchRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || e.changedTouches.length === 0 || rewindingRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const duration = Date.now() - start.t;
    const horizontal = Math.abs(dx) >= 45 && Math.abs(dy) <= 90 && Math.abs(dx) >= Math.abs(dy) * 1.4;
    if (!horizontal || duration > 1000) return;

    const endedAt = Date.now();
    window.setTimeout(() => {
      if (lastFlipRef.current >= endedAt - 60) return; // o próprio livro já virou a página
      try {
        if (dx > 0) bookRef.current?.pageFlip().flipPrev();
        else bookRef.current?.pageFlip().flipNext();
      } catch {
        // livro ainda não pronto: ignora
      }
    }, 170);
  };

  // ---- Voltar para a tela inicial ----
  const goHome = () => {
    music.fadeOut();
    exitFullscreen();
    try {
      bookRef.current?.pageFlip().turnToPage(0); // da próxima vez o livro começa fechado
    } catch {
      // ignora
    }
    clearRewindTimers();
    rewindingRef.current = false;
    setRewinding(false);
    indexRef.current = 0;
    setActivePage(0);
    setShiftPx(0);
    setIsBookOpen(false);
    setShowLanding(true);
  };

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <LightboxProvider>
      <RegistroProvider>
      <CartaProvider>
      {showLanding && (
        <LandingScreen
          onOpen={() => {
            setShowLanding(false);
            setIsBookOpen(true);
          }}
        />
      )}

      {showBook && (
        <main
          className={`experience ${isBookOpen ? "is-visible" : "is-hidden"} ${reader ? "is-reader" : ""}`}
          aria-hidden={!isBookOpen}
        >
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />

          {/* Barra Superior com botão Voltar e Título */}
          <header className="book-top-bar">
            <button type="button" className="return-btn" onClick={goHome} aria-label="Voltar para a tela inicial">
              <ArrowLeft size={16} />
              <span>Início</span>
            </button>

            <div className="site-heading">
              <span className="eyebrow">
                <Heart size={13} fill="currentColor" /> UMA HISTÓRIA NOSSA <Heart size={13} fill="currentColor" />
              </span>
              <h1>
                365 dias <em>de nós</em>
              </h1>
              <p>Um ano de lembranças, descobertas e amor.</p>
            </div>

            <div className="top-bar-placeholder" />
          </header>

          {/* Palco do Livro */}
          <section className="book-stage" aria-label="Livro de memórias">
            <div
              className={`book-container ${rewinding ? "is-rewinding" : ""}`}
              ref={containerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <BookCamera
                play={isBookOpen}
                unlockLabel={isMobile ? "Toque para ler" : "Toque para começar"}
                startDelay={0.8}
                onSettled={isMobile ? () => setReader(true) : undefined}
              >
                <motion.div
                  ref={shiftRef}
                  className="book-shift"
                  animate={{ x: shiftPx }}
                  transition={{ x: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
                >
                  <ActivePageContext.Provider value={activePageValue}>
                    <HTMLFlipBook
                      // Remonta ao entrar/sair do modo leitura para recalcular o tamanho do livro
                      key={reader ? "reader" : "normal"}
                      ref={bookRef as never}
                      onFlip={handleFlip}
                      onInit={handleOrientation}
                      onUpdate={handleOrientation}
                      onChangeState={(e: { data: string }) => {
                        if (e.data === "read") return;
                        lastFlipRef.current = Date.now();
                        // Começa a virar: som de papel (no folhear de volta, o som é um só, tocado no início)
        if (e.data === "flipping" && !rewindingRef.current) sfx.pageTurn();
                      }}
                      width={bookWidthProp}
                      height={bookHeightProp}
                      size="stretch"
                      minWidth={280}
                      maxWidth={800}
                      minHeight={370}
                      maxHeight={bookMaxHeight}
                      maxShadowOpacity={isMobile ? 0.08 : 0.12}
                      showCover
                      mobileScrollSupport
                      drawShadow
                      flippingTime={isMobile ? 600 : 700}
                      usePortrait
                      startPage={activePage}
                      className="memory-book"
                      style={{}}
                      startZIndex={10}
                      autoSize
                      clickEventForward
                      useMouseEvents
                      swipeDistance={28}
                      showPageCorners={false}
                      disableFlipByClick={false}
                      renderOnlyPageLengthChange
                    >
                      {renderedPages}
                    </HTMLFlipBook>
                  </ActivePageContext.Provider>
                </motion.div>
              </BookCamera>
            </div>
          </section>

          {/* Controles do modo leitura (celular) */}
          {reader && (
            <>
              <button type="button" className="reader-close" onClick={exitReader} aria-label="Sair do modo leitura">
                <X size={18} />
              </button>
              <div className="reader-music">
                <MusicToggle />
              </div>
              <span className="reader-counter" aria-live="polite">
                {Math.min(activePage + 1, renderedPages.length)} / {renderedPages.length}
              </span>
            </>
          )}

          {/* Dicas e controles auxiliares */}
          <footer className="page-hint">
            <span>{isMobile ? "Toque nas bordas ou deslize para virar a página" : "Clique na página ou arraste para folhear"}</span>
            <MusicToggle />
            {isMobile && (
              <button type="button" className="music-toggle" onClick={enterReader}>
                <Maximize2 size={15} />
                <span>Modo leitura</span>
              </button>
            )}
            {isMobile && <InstallApp />}
            {PageEditor && (
              <button type="button" className="music-toggle" onClick={() => setEditingPages(true)}>
                <BookOpen size={15} />
                <span>Editar páginas</span>
              </button>
            )}
          </footer>

          {PageEditor && editingPages && (
            <Suspense fallback={null}>
              <PageEditor
                pages={bookPages}
                onClose={() => setEditingPages(false)}
                onSaved={() => window.location.reload()}
              />
            </Suspense>
          )}
        </main>
      )}

      {/* Aviso quando o celular está deitado: o site foi pensado para ficar de pé */}
      <div className="rotate-hint" role="status">
        <span>Vire o celular para ficar de pé ♡</span>
      </div>
      </CartaProvider>
      </RegistroProvider>
      </LightboxProvider>
    </MotionConfig>
  );
}
