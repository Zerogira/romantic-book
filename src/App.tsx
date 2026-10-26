import { useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Heart, Music2 } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import type { PageData } from "./data/bookContent";
import { bookPages } from "./data/bookContent";
import { BookPage } from "./components/book/BookPage";
import { CoverPage } from "./components/book/CoverPage";\nimport { BackCover } from "./components/book/BackCover";
import "./styles/book.css";

type FlipBookHandle = {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    getCurrentPageIndex: () => number;
  };
};

export default function App() {
  const bookRef = useRef<FlipBookHandle | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);

  const totalPages = bookPages.length + 2;
  const goNext = () => bookRef.current?.pageFlip().flipNext();
  const goPrevious = () => bookRef.current?.pageFlip().flipPrev();

  const handleFlip = (event: { data: number }) => {
    setCurrentPage(event.data);
  };

  return (
    <main className="experience">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="site-heading">
        <span className="eyebrow"><Heart size={13} fill="currentColor" /> UMA HISTÓRIA NOSSA</span>
        <h1>365 dias <em>de nós</em></h1>
        <p>Um ano de lembranças, descobertas e amor.</p>
      </header>

      <section className="book-stage" aria-label="Livro de memórias">
        <div className="book-halo" />
        <HTMLFlipBook
          ref={bookRef as never}
          width={430}
          height={570}
          size="stretch"
          minWidth={280}
          maxWidth={560}
          minHeight={370}
          maxHeight={740}
          maxShadowOpacity={0.22}
          showCover
          mobileScrollSupport
          drawShadow
          flippingTime={850}
          usePortrait
          startPage={0}
          onFlip={handleFlip}
          className="memory-book"
          style={{}}
          startZIndex={10}
          autoSize
          clickEventForward
          useMouseEvents
          swipeDistance={28}
          showPageCorners
          disableFlipByClick={false}
        >
          <CoverPage />
          {bookPages.map((page: PageData) => (
            <BookPage key={page.id} page={page} />
          ))}
          <div className="paper-page back-cover">
            <div className="back-cover-inner">
              <Heart size={25} strokeWidth={1.2} />
              <span>continua...</span>
              <small>com amor, sempre.</small>
            </div>
          </div>
        </HTMLFlipBook>
      </section>

      <nav className="book-navigation" aria-label="Controles do livro">
        <button className="nav-button" onClick={goPrevious} disabled={currentPage === 0} aria-label="Página anterior">
          <ChevronLeft size={20} />
        </button>
        <span className="page-counter">
          <BookOpen size={14} />
          {Math.min(currentPage + 1, totalPages)} <i>/</i> {totalPages}
        </span>
        <button className="nav-button" onClick={goNext} disabled={currentPage >= totalPages - 1} aria-label="Próxima página">
          <ChevronRight size={20} />
        </button>
      </nav>

      <footer className="page-hint">
        <span>Use as setas ou arraste a página para continuar</span>
        <button
          className={`music-toggle ${musicEnabled ? "is-active" : ""}`}
          onClick={() => setMusicEnabled((enabled) => !enabled)}
          title="Música será configurada em uma próxima etapa"
          aria-label="Alternar música (em breve)"
        >
          {musicEnabled ? <Music2 size={15} /> : <VolumeX size={15} />}
          <span>Música em breve</span>
        </button>
      </footer>
    </main>
  );
}