// Tela cheia do navegador. Deve ser chamada dentro de um toque do usuário.
// No iPhone (Safari) a API não existe para páginas comuns: a função simplesmente não faz nada.

type OrientationLock = { lock?: (o: string) => Promise<void>; unlock?: () => void };

export function requestFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    // Trava em retrato quando o navegador permitir (Android, em tela cheia)
    const orientation = screen.orientation as ScreenOrientation & OrientationLock;
    orientation?.lock?.("portrait")?.catch?.(() => {});
  } catch {}
}

export function exitFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    const orientation = screen.orientation as ScreenOrientation & OrientationLock;
    orientation?.unlock?.();
  } catch {}
}
