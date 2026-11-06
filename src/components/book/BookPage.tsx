import { createContext, forwardRef, useContext } from "react";
import { motion, type Variants } from "motion/react";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import type { PageData } from "../../data/bookContent";
import { RegistroBlock } from "../registro/RegistroBlock";
import { HandwrittenText } from "../ui/HandwrittenText";
import { ZoomPhoto } from "../ui/ZoomPhoto";
import { CartaBlock } from "../carta/CartaBlock";
import { TrancadaBlock } from "../trancada/TrancadaBlock";
import { SurpriseBlock } from "../surprise/SurpriseBlock";

/**
 * Página visível no livro (atualizada pelo onFlip). No computador o livro mostra duas
 * páginas lado a lado ("spread"): além da página `index`, a seguinte também está visível.
 */
export type ActivePage = { index: number; spread: boolean };
export const ActivePageContext = createContext<ActivePage>({ index: 0, spread: false });

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
  const active = useContext(ActivePageContext);
  // Em duas páginas (e fora da capa), a página à direita também está visível
  const isVisible = active.index === pageIndex || (active.spread && active.index >= 1 && active.index + 1 === pageIndex);
  const state = isVisible ? "show" : "hidden";

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
            {page.image ? <ZoomPhoto src={page.image} alt={page.imageAlt ?? "Lembrança especial"} /> : null}
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
                    <ZoomPhoto src={src} alt={`Foto ${i + 1} da colagem`} />
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
                <HandwrittenText text={`“${page.letterBody ?? ""}”`} active={state === "show"} />
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
            <SurpriseBlock message={page.secretMessage ?? ""} />
          </div>
        )}

        {/* Layout: Registro do dia (foto tirada pela própria pessoa) */}
        {page.layout === "registro" && <RegistroBlock />}

        {/* Layout: Carta de resposta (ela escreve) */}
        {page.layout === "resposta" && <CartaBlock />}

        {/* Layout: Página trancada até uma data futura */}
        {page.layout === "trancada" && <TrancadaBlock active={state === "show"} />}

        {page.note && <p className="page-note">{page.note}</p>}

        <span className="page-number">
          {page.id === "dedicatoria" ? "♡" : "✦"}
        </span>
      </div>
    </div>
  );
});

BookPage.displayName = "BookPage";