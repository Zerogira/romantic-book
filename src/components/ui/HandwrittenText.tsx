import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../../lib/motion";

type Props = {
  text: string;
  /** Começa a escrever na primeira vez que vira true (ex.: a página ficou visível). */
  active: boolean;
};

/**
 * Texto que "se escreve sozinho". Começa quando a página aparece pela primeira vez e
 * CONTINUA escrevendo em segundo plano, mesmo que a pessoa vire a página antes de terminar:
 * ao voltar, o texto já está completo (ou quase). O restante fica invisível, mas ocupa
 * espaço, para a página não mudar de tamanho.
 */
export function HandwrittenText({ text, active }: Props) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);
  // Depois da primeira vez, "started" não volta a false: a escrita não depende mais de a página estar visível
  const [started, setStarted] = useState(false);

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

  return (
    <span className="handwritten" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {!done && started && <span className="handwritten-caret" aria-hidden="true" />}
      <span className="handwritten-rest" aria-hidden="true">
        {text.slice(count)}
      </span>
    </span>
  );
}
