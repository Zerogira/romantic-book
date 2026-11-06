// Tela cheia do navegador. Deve ser chamada dentro de um toque do usuário.
// No iPhone (Safari e Chrome) a API não existe para páginas comuns: as funções não fazem nada
// e a única tela cheia de verdade é o modo app (adicionar à tela inicial).

type OrientationLock = { lock?: (o: string) => Promise<void>; unlock?: () => void };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };

/** true quando este navegador consegue entrar em tela cheia (Android e computador; não o iPhone). */
export function supportsFullscreen(): boolean {
  const el = document.documentElement as FsElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

function fullscreenElement(): Element | null {
  const doc = document as FsDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function requestFullscreen() {
  try {
    const el = document.documentElement as FsElement;
    if (!fullscreenElement()) {
      const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
      const result = request?.call(el);
      if (result && typeof (result as Promise<void>).catch === "function") (result as Promise<void>).catch(() => {});
    }
    // Trava em retrato quando o navegador permitir (Android, em tela cheia)
    const orientation = screen.orientation as ScreenOrientation & OrientationLock;
    orientation?.lock?.("portrait")?.catch?.(() => {});
  } catch {}
}

export function exitFullscreen() {
  try {
    const doc = document as FsDocument;
    if (fullscreenElement()) {
      const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
      const result = exit?.call(doc);
      if (result && typeof (result as Promise<void>).catch === "function") (result as Promise<void>).catch(() => {});
    }
    const orientation = screen.orientation as ScreenOrientation & OrientationLock;
    orientation?.unlock?.();
  } catch {}
}
