export type StickerItem = {
  id: string;
  type: "cat-pink" | "cat-blue" | "polaroid" | "sticky-note" | "stars-cluster";
  label: string;
  x: number; // Porcentagem horizontal (0 a 100%)
  y: number; // Porcentagem vertical (0 a 100%)
  rotation: number; // Rotação em graus (-45 a 45)
  caption?: string;
  image?: string;
};

export const defaultStickers: StickerItem[] = [
  {
    id: "cat-pink",
    type: "cat-pink",
    label: "Gatinho Rosa",
    x: 6,
    y: 78,
    rotation: -4,
  },
  {
    id: "cat-blue",
    type: "cat-blue",
    label: "Gatinho Azul",
    x: 88,
    y: 8,
    rotation: 6,
  },
  {
    id: "polaroid-left",
    type: "polaroid",
    label: "Polaroid Esquerda",
    x: 7,
    y: 28,
    rotation: -7,
    caption: "nosso dia especial ♡",
  },
  {
    id: "polaroid-right",
    type: "polaroid",
    label: "Polaroid Direita",
    x: 86,
    y: 65,
    rotation: 6,
    caption: "para sempre nós ✨",
  },
  {
    id: "sticky-note",
    type: "sticky-note",
    label: "Bilhetinho de Amor",
    x: 78,
    y: 35,
    rotation: -3,
    caption: "lembrete: você é o meu lugar favorito no mundo! ♡",
  },
  {
    id: "stars-cluster",
    type: "stars-cluster",
    label: "Estrelinhas e Corações",
    x: 18,
    y: 12,
    rotation: 0,
  },
];
