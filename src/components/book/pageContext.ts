import { createContext } from "react";

/**
 * Página visível no livro (atualizada pelo onFlip). No computador o livro mostra duas
 * páginas lado a lado ("spread"): além da página `index`, a seguinte também está visível.
 */
export type ActivePage = { index: number; spread: boolean };
export const ActivePageContext = createContext<ActivePage>({ index: 0, spread: false });

/** Número (no livro) da página que contém o componente; null fora das páginas. */
export const PageIndexContext = createContext<number | null>(null);
