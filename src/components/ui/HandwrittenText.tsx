import { useEffect, useRef, useState, type RefObject } from "react";
import { usePrefersReducedMotion } from "../../lib/motion";

type Props = {
  text: string;
  /** Começa a escrever na primeira vez que vira true (ex.: a página ficou visível). */
  active: boolean;
  /**
   * Caixa com rolagem que acompanha o texto enquanto ele se escreve: quando a escrita chega
   * perto da borda de baixo, a caixa desce devagar. Se a pessoa rolar sozinha, o texto para de
   * puxar a rolagem.
   */
  followScroll?: RefObject<HTMLElement | null>;
};

/**
 * Texto que "se escreve sozinho". Começa quando a página aparece pela primeira vez e
 * CONTINUA escrevendo em segundo plano, mesmo que a pessoa vire a página antes de terminar:
 * ao voltar, o texto já está completo (ou quase). O restante fica invisível, mas ocupa
 * espaço, para a página não mudar de tamanho.
 */
export function HandwrittenText({ text, active, followScroll }: Props) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);
  // Depois da primeira vez, "started" não volta a false: a escrita não depende mais de a página estar visível
  const [started, setStarted] = useState(false);
  const caretRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (active) setStarted(true);
  }, [active]);

  useEffect(() => {
    if (!started) return;
    if (reduced) {
      setCount(text.length);
      return;
    }
    // Duração total entre 2,5 s e 9 s, conforme o tamanho do texto
    const total = Math.min(9000, Math.max(2500, text.length * 45));
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / total);
      setCount(Math.ceil(progress * text.length));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, reduced, text]);

  const done = count >= text.length;
  const doneRef = useRef(done);
  doneRef.current = done;

  // Rolagem automática: acompanha o cursor de escrita com um movimento suave
  useEffect(() => {
    const box = followScroll?.current;
    if (!box || !started || reduced || doneRef.current) return;

    let manual = false;
    let frame = 0;
    const stopFollowing = () => {
      manual = true;
    };
    box.addEventListener("wheel", stopFollowing, { passive: true });
    box.addEventListener("touchstart", stopFollowing, { passive: true });
    box.addEventListener("pointerdown", stopFollowing);

    const MARGIN = 36; // distância mínima entre o cursor e a borda de baixo
    const tick = () => {
      if (manual) return;
      if (doneRef.current) {
        // Terminou de escrever: desce até o fim para mostrar o fechamento da carta
        box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
        return;
      }
      const caret = caretRef.current;
      if (caret) {
        const over = caret.getBoundingClientRect().bottom - (box.getBoundingClientRect().bottom - MARGIN);
        if (over > 0) box.scrollTop += Math.max(0.7, over * 0.09);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      box.removeEventListener("wheel", stopFollowing);
      box.removeEventListener("touchstart", stopFollowing);
      box.removeEventListener("pointerdown", stopFollowing);
    };
  }, [followScroll, started, reduced]);

  return (
    <span className="handwritten" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {!done && started && <span ref={caretRef} className="handwritten-caret" aria-hidden="true" />}
      <span className="handwritten-rest" aria-hidden="true">
        {text.slice(count)}
      </span>
    </span>
  );
}
