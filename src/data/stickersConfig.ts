import stickersData from "./stickers.json";
import stickersMobileData from "./stickers.mobile.json";

export type StickerType =
  | "cat-pink"
  | "cat-blue"
  | "polaroid"
  | "sticky-note"
  | "stars-cluster"
  | "gif";

export type StickerItem = {
  id: string;
  type: StickerType;
  label: string;
  x: number; // Porcentagem horizontal (0 a 100%)
  y: number; // Porcentagem vertical (0 a 100%)
  rotation: number; // Rotação em graus (-45 a 45)
  caption?: string;
  image?: string;
  src?: string; // Caminho do GIF/imagem (tipo "gif")
  scale?: number; // Tamanho relativo (1 = padrão)
};

/**
 * Figurinhas padrão. A fonte da verdade é src/data/stickers.json:
 * no modo edição (npm run dev) o botão "Salvar no projeto" grava esse arquivo.
 */
export const defaultStickers = stickersData as StickerItem[];

/**
 * Figurinhas para telas de celular (até 640px), em lista própria e menor.
 * Fonte da verdade: src/data/stickers.mobile.json. No modo edição, abrir o site
 * em tela estreita (emulação de celular) edita e salva esta lista.
 */
export const mobileStickers = stickersMobileData as StickerItem[];
