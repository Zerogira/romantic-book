import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function read(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Retorna true quando o usuário pediu menos movimento no sistema operacional. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(read);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
