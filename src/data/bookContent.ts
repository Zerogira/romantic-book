import pagesData from "./pages.json";

export type PageLayout =
  | "intro"
  | "photo"
  | "collage"
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
  // Colagem (layout "collage"): até 2 fotos
  images?: string[];
  detailsList?: { label: string; value: string }[];
  timelineItems?: { date: string; title: string; description: string }[];
  // Carta (layout "letter") e surpresa (layout "closure")
  letterBody?: string;
  secretMessage?: string;
};

/**
 * Páginas do álbum. A fonte da verdade é src/data/pages.json:
 * no modo edição (npm run dev) o editor de páginas grava esse arquivo.
 */
export const bookPages = pagesData as PageData[];

export const bookCoverInfo = {
  kicker: "NOSSO PRIMEIRO CAPÍTULO",
  title: "365 dias de nós",
  subtitle: "Uma pequena história sobre duas pessoas que escolheram caminhar juntas.",
  dateText: "1º Ano de Aniversário • 365 Dias de Amor",
};
