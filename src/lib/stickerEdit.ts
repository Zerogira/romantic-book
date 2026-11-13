import { useSyncExternalStore } from "react";
import type { StickerItem } from "../data/stickersConfig";
import type { PageData } from "../data/bookContent";

/*
 * Estado do modo edição das figurinhas das páginas (só no desenvolvimento).
 *
 * Cada página tem duas listas: "inner" (dentro da página, em % da página) e "outer"
 * (ao redor do livro, em % da tela, só no computador). Enquanto o editor está aberto,
 * as listas editadas ficam aqui ("overrides") e o livro mostra essas versões ao vivo;
 * ao salvar, o editor grava tudo em src/data/pages.json. Em produção este estado nunca
 * muda, então o livro mostra apenas as figurinhas gravadas nas páginas.
 */
export type StickerScope = "inner" | "outer";

type Entry = { inner?: StickerItem[]; outer?: StickerItem[] };

export type StickerEditState = {
  enabled: boolean;
  /** Página em edição (as figurinhas dela ficam arrastáveis). */
  pageId: string | null;
  scope: StickerScope;
  selectedId: string | null;
  overrides: Record<string, Entry>;
};

let state: StickerEditState = { enabled: false, pageId: null, scope: "inner", selectedId: null, overrides: {} };
const listeners = new Set<() => void>();

function commit(patch: Partial<StickerEditState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const stickerEdit = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getState: () => state,
  enable: () => commit({ enabled: true }),
  reset: () => commit({ enabled: false, pageId: null, selectedId: null, overrides: {} }),
  setPage: (pageId: string) => commit({ pageId, selectedId: null }),
  setScope: (scope: StickerScope) => commit({ scope, selectedId: null }),
  select: (scope: StickerScope, id: string | null) => commit({ scope, selectedId: id }),
  setList(pageId: string, scope: StickerScope, list: StickerItem[]) {
    commit({ overrides: { ...state.overrides, [pageId]: { ...state.overrides[pageId], [scope]: list } } });
  },
};

export function useStickerEdit(): StickerEditState {
  return useSyncExternalStore(stickerEdit.subscribe, stickerEdit.getState, stickerEdit.getState);
}

/** Figurinhas de uma página (a versão em edição, se houver, senão a gravada). */
export function stickersOf(page: PageData, scope: StickerScope, edit: StickerEditState): StickerItem[] {
  const edited = edit.overrides[page.id]?.[scope];
  if (edited) return edited;
  return (scope === "inner" ? page.stickers : page.outerStickers) ?? [];
}

/** Aplica as edições às páginas, no formato que vai para o pages.json (listas vazias somem). */
export function applyStickerEdits(pages: PageData[], overrides: Record<string, Entry>): PageData[] {
  return pages.map((page) => {
    const entry = overrides[page.id];
    if (!entry) return page;
    const next: PageData = { ...page };
    if (entry.inner) {
      if (entry.inner.length) next.stickers = entry.inner;
      else delete next.stickers;
    }
    if (entry.outer) {
      if (entry.outer.length) next.outerStickers = entry.outer;
      else delete next.outerStickers;
    }
    return next;
  });
}
