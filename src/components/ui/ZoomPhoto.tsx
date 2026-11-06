import { useLightbox } from "./Lightbox";

type Props = {
  src: string;
  alt: string;
};

/**
 * Foto que abre ampliada ao tocar. Fica dentro de um <button> de propósito: o livro
 * (react-pageflip) só repassa cliques para botões e links dentro das páginas.
 */
export function ZoomPhoto({ src, alt }: Props) {
  const open = useLightbox();

  return (
    <button type="button" className="zoom-trigger" onClick={() => open(src, alt)} aria-label={`Ampliar foto: ${alt}`}>
      <img
        src={src}
        alt={alt}
        draggable={false}
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
