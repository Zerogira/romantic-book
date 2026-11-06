import { useEffect, useState } from "react";

/** Largura máxima considerada "celular" (retrato). */
export const MOBILE_QUERY = "(max-width: 640px)";

export function isMobileNow(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** true quando a tela é estreita como a de um celular; acompanha o redimensionamento. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(isMobileNow);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
