import { createContext, forwardRef, useContext, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Heart, Sparkles, Image as ImageIcon } from "lucide-react";
import type { PageData } from "../../data/bookContent";

/** Índice da página que está visível no livro (atualizado pelo onFlip). */
export const ActivePageContext = createContext<number>(0);

type Props = { page: PageData; pageIndex: number };

// Itens entram em cascata quando a página fica ativa; saem ao virar
const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export const BookPage = forwardRef<HTMLDivElement, Props>(({ page, pageIndex }, ref) => {
  const [revealed, setRevealed] = useState(false);
  const activeIndex = useContext(ActivePageContext);
  const state = activeIndex === pageIndex ? "show" : "hidden";

  return (
    <div
      className={`paper-page content-page layout-${page.layout}`}
      ref={ref}
      data-density="soft"
    >
      <div className="page-grain" />

      <div className="page-content">
        <header className="page-header">
          <span className="chapter-label">{page.chapter}</span>
          <h2>{page.title}</h2>
        </header>

        <p className="page-copy">{page.text}</p>

        {/* Layout: Foto Única (Polaroid) */}
        {page.layout === "photo" && (
          <figure className="photo-placeholder single-photo">
            {page.image ? (
              <img
                src={page.image}
                alt={page.imageAlt ?? "Lembrança especial"}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.parentElement?.classList.add("is-empty");
                }}
              />
            ) : null}
            <figcaption>
              <ImageIcon size={14} className="caption-icon" />
              <span>onde tudo começou</span>
            </figcaption>
          </figure>
        )}

        {/* Layout: Colagem de Fotos */}
        {page.layout === "collage" && (
          <div className="photo-collage">
            {[0, 1].map((i) => {
              const src = page.images?.[i];
              return (
                <div key={i} className={`collage-card card-${i + 1} ${src ? "" : "is-empty"}`}>
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.parentElement?.classList.add("is-empty");
                      }}
                    />
                  ) : (
                    <span>{i === 0 ? "nossa primeira foto" : "um dia inesquecível"}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Layout: Linha do Tempo */}
        {page.layout === "timeline" && page.timelineItems && (
          <motion.div className="timeline-container" variants={listVariants} initial="hidden" animate={state}>
            {page.timelineItems.map((item, index) => (
              <motion.div className="timeline-item" key={item.date} variants={itemVariants}>
                <div className="timeline-badge">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="timeline-details">
                  <span className="timeline-date">{item.date}</span>
                  <strong className="timeline-title">{item.title}</strong>
                  <p className="timeline-desc">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Layout: Pequenos Detalhes */}
        {page.layout === "details" && page.detailsList && (
          <motion.div className="details-grid" variants={listVariants} initial="hidden" animate={state}>
            {page.detailsList.map((item) => (
              <motion.div className="detail-card" key={item.label} variants={itemVariants}>
                <span className="detail-label">✦ {item.label}</span>
                <p className="detail-value">{item.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Layout: Carta Romântica Manuscrita */}
        {page.layout === "letter" && (
          <div className="letter-wrapper">
            <div className="letter-paper">
              <p className="letter-body">
                “{page.letterBody}”
              </p>
              <div className="letter-signature">
                <span>Com todo o meu amor,</span>
                <strong>Para sempre nós. ♡</strong>
              </div>
            </div>
          </div>
        )}

        {/* Layout: Encerramento com Surpresa */}
        {page.layout === "closure" && (
          <div className="closure-container">
            <div className="closure-icon-box">
              <Sparkles size={24} className="sparkle-pulse" />
            </div>
            <button
              type="button"
              className={`surprise-btn ${revealed ? "is-revealed" : ""}`}
              onClick={() => setRevealed(!revealed)}
              aria-label="Abrir surpresa especial"
            >
              <Heart size={18} fill={revealed ? "#e11d48" : "none"} />
              <span>{revealed ? "Nossa promessa:" : "Toque para abrir a surpresa"}</span>
            </button>
            <AnimatePresence>
              {revealed && (
                <motion.div
                  key="secret"
                  className="secret-message"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p>“{page.secretMessage}”</p>
                  <small>Te amo infinitamente! ✨</small>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {page.note && <p className="page-note">{page.note}</p>}

        <span className="page-number">
          {page.id === "dedicatoria" ? "♡" : "✦"}
        </span>
      </div>
    </div>
  );
});

BookPage.displayName = "BookPage";