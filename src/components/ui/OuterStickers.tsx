import { AnimatePresence, motion } from "motion/react";
import { bookPages } from "../../data/bookContent";
import type { ActivePage } from "../book/BookPage";
import { stickersOf, useStickerEdit } from "../../lib/stickerEdit";
import { StickerLayer } from "./StickerLayer";

/**
 * Figurinhas ao redor do livro (só no computador). Cada página tem as suas: ao folhear, as da
 * página que sai desaparecem suavemente e as da página que chega aparecem. Ficam atrás do livro
 * e não recebem toques (são só decoração).
 */
export function OuterStickers({ active }: { active: ActivePage }) {
  const edit = useStickerEdit();

  // Mesmas páginas que o livro mostra (a capa é a página 0 e não tem figurinhas)
  const indices: number[] = [];
  if (active.index >= 1) indices.push(active.index);
  if (active.spread && active.index >= 1) indices.push(active.index + 1);
  const pages = indices.map((i) => bookPages[i - 1]).filter(Boolean);

  // Na edição, a página escolhida no editor sempre aparece, mesmo se o livro ainda não chegou nela
  const editing = edit.enabled ? bookPages.find((p) => p.id === edit.pageId) : undefined;
  if (editing && !pages.includes(editing)) pages.push(editing);

  const key = pages.map((p) => p.id).join("+");

  return (
    <AnimatePresence>
      <motion.div
        key={key || "none"}
        className={`outer-stickers ${edit.enabled ? "is-editing" : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {pages.map((page) => (
          <StickerLayer
            key={page.id}
            scope="outer"
            pageId={page.id}
            stickers={stickersOf(page, "outer", edit)}
            editable={edit.enabled && edit.pageId === page.id}
            selectedId={edit.selectedId}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
