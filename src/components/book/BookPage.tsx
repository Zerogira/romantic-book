import { forwardRef } from "react";
import type { PageData } from "../../data/bookContent";

type Props = { page: PageData };

export const BookPage = forwardRef<HTMLDivElement, Props>(({ page }, ref) => {
  return (
    <div className={`paper-page content-page layout-${page.layout}`} ref={ref}>
      <div className="page-grain" />
      <div className="page-content">
        <span className="chapter-label">{page.chapter}</span>
        <h2>{page.title}</h2>
        <p className="page-copy">{page.text}</p>

        {page.layout === "timeline" && (
          <div className="timeline-placeholder">
            {["O primeiro capítulo", "Uma lembrança especial", "Novas descobertas", "Hoje: 365 dias"].map((item, index) => (
              <div className="timeline-item" key={item}>
                <span className="timeline-dot">{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {page.layout === "photo" && page.image && (
          <figure className="photo-placeholder">
            <img
              src={page.image}
              alt={page.imageAlt ?? ""}
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement?.classList.add("is-empty");
              }}
            />
            <figcaption>uma lembrança para guardar</figcaption>
          </figure>
        )}

        {page.layout === "quote" && (
          <blockquote className="handwritten-quote">
            “O melhor da vida é ter com quem dividir os pequenos momentos.”
          </blockquote>
        )}

        {page.note && <p className="page-note">{page.note}</p>}
        <span className="page-number">{page.id === "dedicatoria" ? "♡" : "✳"}</span>
      </div>
    </div>
  );
});

BookPage.displayName = "BookPage";