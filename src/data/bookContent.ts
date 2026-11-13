import pagesData from "./pages.json";
import type { StickerItem } from "./stickersConfig";

export type PageLayout =
  | "intro"
  | "photo"
  | "collage"
  | "trio" // 3 fotos: 2 verticais lado a lado e 1 horizontal embaixo
  | "quad" // 4 fotos: 2 em cima e 2 embaixo
  | "trioInvertido" // 3 fotos: 1 horizontal em cima e 2 verticais embaixo
  | "trioVertical" // 3 fotos em pé: 2 em cima e 1 embaixo
  | "zigzag" // 3 fotos em diagonal: esquerda, direita, esquerda
  | "trioHorizontal" // 3 fotos deitadas, uma sobre a outra, alternando os lados
  | "timeline"
  | "details"
  | "letter"
  | "closure"
  | "registro" // foto tirada no dia (ver src/components/registro)
  | "resposta" // carta digitada por ela (ver src/components/carta)
  | "trancada"; // página que só abre em uma data futura (ver src/components/trancada)

export type PageData = {
  id: string;
  chapter: string;
  title: string;
  text: string;
  note?: string;
  layout: PageLayout;
  // Foto única (layout "photo")
  image?: string;
  imageAlt?: string;
  // Colagem (layout "collage"): até 2 fotos; trio (layout "trio"): 3 fotos, nessa ordem
  images?: string[];
  detailsList?: { label: string; value: string }[];
  timelineItems?: { date: string; title: string; description: string }[];
  // Figurinhas só decorativas (não recebem toque). "stickers": dentro da página, em % da página.
  // "outerStickers": ao redor do livro (só computador), em % da tela, aparecem quando a página está aberta.
  stickers?: StickerItem[];
  outerStickers?: StickerItem[];
  // Carta (layout "letter") e surpresa (layout "closure")
  letterBody?: string;
  secretMessage?: string;
};

/**
 * Páginas do álbum. A fonte da verdade é src/data/pages.json:
 * no modo edição (npm run dev) o editor de páginas grava esse arquivo.
 */
export const bookPages = pagesData as PageData[];

/** Só no modo edição: troca o conteúdo do livro sem recarregar a tela (botão "Aplicar"). */
export function replaceBookPages(pages: PageData[]) {
  bookPages.splice(0, bookPages.length, ...pages);
}

export const bookCoverInfo = {
  kicker: "NOSSO PRIMEIRO CAPÍTULO",
  title: "365 dias de nós",
  subtitle: "Uma história sobre duas pessoas que escolheram caminhar juntas.",
  dateText: "1º Ano de Aniversário • 365 Dias de Amor",
};
