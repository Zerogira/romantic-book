// Galeria única de figurinhas e imagens (public/images/figurinhas).
// Tanto a área inicial ("Editar Figurinhas") quanto o editor de páginas leem daqui.
// Só existe no servidor de desenvolvimento (npm run dev).

export function fetchStickerAssets(): Promise<string[]> {
  return fetch("/__stickers/assets").then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<string[]>;
  });
}
