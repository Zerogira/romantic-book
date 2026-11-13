import { useContext, useEffect, useState } from "react";
import { ActivePageContext, PageIndexContext } from "../book/pageContext";
import { useLightbox } from "./Lightbox";

type Props = {
  src: string;
  alt: string;
};

/**
 * Quantas páginas, para cada lado da página aberta, já carregam as fotos. A margem é larga de
 * propósito: o livro só baixa as fotos de quem está perto, mas a página seguinte nunca aparece
 * em branco, mesmo se a pessoa folhear rápido. Foto que já carregou nunca é descarregada.
 */
export const PRELOAD_MARGIN = 6;

/**
 * Foto que abre ampliada ao tocar. Fica dentro de um <button> de propósito: o livro
 * (react-pageflip) só repassa cliques para botões e links dentro das páginas.
 */
export function ZoomPhoto({ src, alt }: Props) {
  const open = useLightbox();
  const active = useContext(ActivePageContext);
  const pageIndex = useContext(PageIndexContext);

  const near = pageIndex === null || Math.abs(pageIndex - active.index) <= PRELOAD_MARGIN;
  const [loaded, setLoaded] = useState(near);
  useEffect(() => {
    if (near) setLoaded(true);
  }, [near]);

  return (
    <button type="button" className="zoom-trigger" onClick={() => open(src, alt)} aria-label={`Ampliar foto: ${alt}`}>
      <img
        src={near || loaded ? src : undefined}
        alt={alt}
        draggable={false}
        decoding="async"
        onError={(event) => {
          const img = event.currentTarget;
          // Foto não encontrada: volta ao cartão vazio do layout
          img.closest("figure, .collage-card")?.classList.add("is-empty");
          img.closest("button")?.style.setProperty("display", "none");
        }}
      />
    </button>
  );
}
