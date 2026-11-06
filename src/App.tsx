import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Music2, VolumeX, ArrowLeft } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import type { PageData } from "./data/bookContent";
import { bookPages } from "./data/bookContent";
import { BookPage, ActivePageContext } from "./components/book/BookPage";
import { MotionConfig } from "motion/react";
import { BookCamera } from "./components/book/BookCamera";
import { lazy, Suspense } from "react";
import { BookOpen } from "lucide-react";

// Editor de páginas: existe apenas no servidor de desenvolvimento
const PageEditor = import.meta.env.DEV
  ? lazy(() => import("./components/dev/PageEditor").then((m) => ({ default: m.PageEditor })))
  : null;
import { CoverPage } from "./components/book/CoverPage";
import { BackCover } from "./components/book/BackCover";
import { LandingScreen } from "./components/ui/LandingScreen";
import { music, sfx, MUSIC_SRC } from "./lib/audio";
import { useIsMobile } from "./lib/device";
import { Maximize2, X } from "lucide-react";
import "./styles/book.css";

import { requestFullscreen, exitFullscreen } from "./lib/fullscreen";
import { RegistroProvider } from "./components/registro/RegistroProvider";
import { LightboxProvider } from "./components/ui/Lightbox";
import { CartaProvider } from "./components/carta/CartaProvider";
import { InstallApp } from "./components/ui/InstallApp";

type FlipBookHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    getCurrentPageIndex: () => number;
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
  const [activePage, setActivePage] = useState(0);
  const [spread, setSpread] = useState(false); // true quando o livro mostra duas páginas lado a lado
  const activePageValue = useMemo(() => ({ index: activePage, spread }), [activePage, spread]);
  const [editingPages, setEditingPages] = useState(false);
  const [reader, setReader] = useState(false); // modo leitura (celular): livro em tela cheia
  const isMobile = useIsMobile();
  const bookRef = useRef<FlipBookHandle | null>(null);
  // Altura máxima do livro acompanha a tela (sem rolagem): cabeçalho e rodapé ocupam ~250px
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const viewportHeight = viewport.h;
  // No modo leitura o livro ocupa quase toda a tela e pode ficar mais alto que o padrão
  const bookMaxHeight = reader ? Math.max(400, viewportHeight - 16) : Math.max(400, Math.round(viewportHeight - 250));
  const readerRatio = Math.min(1.75, Math.max(1.38, (viewportHeight - 16) / viewport.w));
  const bookWidthProp = 500;
  const bookHeightProp = reader ? Math.round(bookWidthProp * readerRatio) : 690;

  // Modo leitura só muda o layout; a tela cheia é controlada pela experiência inteira
  const enterReader = () => {
    requestFullscreen();
    setReader(true);
  };
  const exitReader = () => {
    setReader(false);
  };

  // Sai do modo leitura ao voltar para a tela inicial ou ao sair do celular (ex.: girar para computador)
  useEffect(() => {
    if (!isBookOpen || !isMobile) setReader(false);
  }, [isBookOpen, isMobile]);

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

  return (
    <MotionConfig reducedMotion="user">
      <LightboxProvider>
      <RegistroProvider>
      <CartaProvider>
      {!isBookOpen ? (
        <LandingScreen onOpen={() => setIsBookOpen(true)} />
      ) : (
        <main className={`experience fade-in-book ${reader ? "is-reader" : ""}`}>
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />

          {/* Barra Superior com botão Voltar e Título */}
          <header className="book-top-bar">
            <button
              type="button"
              className="return-btn"
              onClick={() => {
                music.fadeOut();
                exitFullscreen();
                setIsBookOpen(false);
              }}
              aria-label="Voltar para a tela inicial"
            >
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
            <div className="book-container">
              <BookCamera
                unlockLabel={isMobile ? "Toque para ler" : "Toque para começar"}
                startDelay={0.9}
                onSettled={isMobile ? () => setReader(true) : undefined}
              >
              <ActivePageContext.Provider value={activePageValue}>
              <HTMLFlipBook
                // Remonta ao entrar/sair do modo leitura para recalcular o tamanho do livro
                key={reader ? "reader" : "normal"}
                ref={bookRef as never}
                onFlip={(e: { data: number }) => setActivePage(e.data)}
                onInit={(e: { data: { mode: string } }) => setSpread(e.data.mode === "landscape")}
                onUpdate={(e: { data: { mode: string } }) => setSpread(e.data.mode === "landscape")}
                onChangeState={(e: { data: string }) => {
                  if (e.data === "flipping") sfx.pageTurn(); // começa a virar: som de papel
                }}
                width={bookWidthProp}
                height={bookHeightProp}
                size="stretch"
                minWidth={280}
                maxWidth={800}
                minHeight={370}
                maxHeight={bookMaxHeight}
                maxShadowOpacity={0.12}
                showCover
                mobileScrollSupport
                drawShadow
                flippingTime={700}
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
              </BookCamera>
            </div>
          </section>

          {/* Dicas e controles auxiliares */}
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