import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Só no desenvolvimento: abrir o site com ?motion=1 força as animações, mesmo com "reduzir movimento" ligado no sistema (útil para testar). */
const FORCE_MOTION =
  import.meta.env.DEV &&
  typeof location !== "undefined" &&
  (new URLSearchParams(location.search).has("motion") || (window as unknown as { __FORCE_MOTION__?: boolean }).__FORCE_MOTION__ === true);

function read(): boolean {
  if (FORCE_MOTION) return false;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Retorna true quando o usuário pediu menos movimento no sistema operacional. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(read);

  useEffect(() => {
    if (FORCE_MOTION || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
