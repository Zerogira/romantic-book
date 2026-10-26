import { useMemo, useRef, useState } from "react";
import { Heart, Music2, VolumeX, ArrowLeft } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import type { PageData } from "./data/bookContent";
import { bookPages } from "./data/bookContent";
import { BookPage } from "./components/book/BookPage";
import { CoverPage } from "./components/book/CoverPage";
import { BackCover } from "./components/book/BackCover";
import { LandingScreen } from "./components/ui/LandingScreen";
import "./styles/book.css";

type FlipBookHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    getCurrentPageIndex: () => number;
  };
};

function MusicToggle() {
  const [musicEnabled, setMusicEnabled] = useState(false);

  return (
    <button
      type="button"
      className={`music-toggle ${musicEnabled ? "is-active" : ""}`}
      onClick={() => setMusicEnabled((enabled) => !enabled)}
      title="Música será configurada com a sua canção favorita"
      aria-label="Alternar música"
    >
      {musicEnabled ? <Music2 size={15} /> : <VolumeX size={15} />}
      <span>{musicEnabled ? "Música ligada" : "Música em breve"}</span>
    </button>
  );
}

export default function App() {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const bookRef = useRef<FlipBookHandle | null>(null);

  // Páginas estáveis memoizadas
  const renderedPages = useMemo(
    () => [
      <CoverPage key="page-cover" />,
      ...bookPages.map((page: PageData) => (
        <BookPage key={page.id} page={page} />
      )),
      <BackCover key="page-back-cover" />,
    ],
    []
  );

  return (
    <>
      {!isBookOpen ? (
        <LandingScreen onOpen={() => setIsBookOpen(true)} />
      ) : (
        <main className="experience fade-in-book">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />

          {/* Barra Superior com botão Voltar e Título */}
          <header className="book-top-bar">
            <button
              type="button"
              className="return-btn"
              onClick={() => setIsBookOpen(false)}
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
              <HTMLFlipBook
                ref={bookRef as never}
                width={420}
                height={560}
                size="stretch"
                minWidth={280}
                maxWidth={540}
                minHeight={370}
                maxHeight={720}
                maxShadowOpacity={0.12}
                showCover
                mobileScrollSupport
                drawShadow
                flippingTime={700}
                usePortrait
                startPage={0}
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
            </div>
          </section>

          {/* Dicas e controles auxiliares */}
          <footer className="page-hint">
            <span>Clique na página ou arraste para folhear</span>
            <MusicToggle />
          </footer>
        </main>
      )}
    </>
  );
}