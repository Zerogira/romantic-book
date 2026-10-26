import { forwardRef, useState } from "react";
import { Heart, Sparkles, Image as ImageIcon } from "lucide-react";
import type { PageData } from "../../data/bookContent";

type Props = { page: PageData };

export const BookPage = forwardRef<HTMLDivElement, Props>(({ page }, ref) => {
  const [revealed, setRevealed] = useState(false);

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
            <div className="collage-card card-1 is-empty">
              <span>nossa primeira foto</span>
            </div>
            <div className="collage-card card-2 is-empty">
              <span>um dia inesquecível</span>
            </div>
          </div>
        )}

        {/* Layout: Linha do Tempo */}
        {page.layout === "timeline" && page.timelineItems && (
          <div className="timeline-container">
            {page.timelineItems.map((item, index) => (
              <div className="timeline-item" key={item.date}>
                <div className="timeline-badge">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="timeline-details">
                  <span className="timeline-date">{item.date}</span>
                  <strong className="timeline-title">{item.title}</strong>
                  <p className="timeline-desc">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Layout: Pequenos Detalhes */}
        {page.layout === "details" && page.detailsList && (
          <div className="details-grid">
            {page.detailsList.map((item) => (
              <div className="detail-card" key={item.label}>
                <span className="detail-label">✦ {item.label}</span>
                <p className="detail-value">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Layout: Carta Romântica Manuscrita */}
        {page.layout === "letter" && (
          <div className="letter-wrapper">
            <div className="letter-paper">
              <p className="letter-body">
                “Meu amor, cada dia ao seu lado é uma lembrança bonita que guardo com carinho. Obrigado por ser minha risada favorita, meu colo quentinho e meu parceiro em todos os momentos.”
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
            {revealed && (
              <div className="secret-message">
                <p>“Prometo te escolher hoje, amanhã e em todos os próximos 365 dias que virão.”</p>
                <small>Te amo infinitamente! ✨</small>
              </div>
            )}
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