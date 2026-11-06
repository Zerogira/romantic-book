import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePrefersReducedMotion } from "../../lib/motion";
import { isMobileNow } from "../../lib/device";

/*
 * "Câmera de cinema" da abertura: o livro começa inclinado para a esquerda,
 * desliza e gira até ficar inclinado para a direita, e fica assim até o
 * primeiro toque do leitor, que o endireita e libera o folhear.
 *
 * Os valores ficam aqui para ajustar o gosto sem mexer na lógica.
 * No celular o deslocamento é menor, para o livro não sair da tela.
 */
const CAMERA_DESKTOP = {
  start: { rotateY: -30, rotateX: 7, x: -90, scale: 0.9 },
  end: { rotateY: 26, rotateX: 3, x: 50, scale: 1.02 },
  moveDuration: 2.8,
  settleDuration: 1.1,
};

const CAMERA_MOBILE = {
  start: { rotateY: -24, rotateX: 5, x: -28, scale: 0.88 },
  end: { rotateY: 20, rotateX: 3, x: 18, scale: 0.98 },
  moveDuration: 2.6,
  settleDuration: 0.9,
};

type Props = {
  children: ReactNode;
  /** Texto do aviso sobre o livro inclinado. */
  unlockLabel?: string;
  /** Chamado dentro do toque do usuário (útil para pedir tela cheia). */
  onUnlock?: () => void;
  /** Chamado quando o livro terminou de se endireitar. */
  onSettled?: () => void;
};

export function BookCamera({ children, unlockLabel = "Toque para começar", onUnlock, onSettled }: Props) {
  const rigRef = useRef<HTMLDivElement | null>(null);
  const settlingRef = useRef(false);
  const [resting, setResting] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const { contextSafe } = useGSAP(
    () => {
      const rig = rigRef.current;
      if (!rig || reducedMotion) return;
      const camera = isMobileNow() ? CAMERA_MOBILE : CAMERA_DESKTOP;

      // Durante o movimento o hit-test do page-flip fica incorreto (o livro está
      // transformado), então bloqueamos os cliques até a câmera parar.
      gsap.timeline({
        onStart: () => {
          rig.style.pointerEvents = "none";
        },
        onComplete: () => {
          rig.style.pointerEvents = "";
          setResting(true);
        },
      }).fromTo(rig, { ...camera.start }, {
        ...camera.end,
        duration: camera.moveDuration,
        ease: "power2.inOut",
      });
    },
    { scope: rigRef, dependencies: [reducedMotion] }
  );

  // Primeiro toque: endireita o livro. O overlay continua até o fim, para o
  // clique não cair em uma página no meio do movimento.
  const straighten = contextSafe(() => {
    const rig = rigRef.current;
    if (!rig || settlingRef.current) return;
    settlingRef.current = true;
    onUnlock?.();
    const camera = isMobileNow() ? CAMERA_MOBILE : CAMERA_DESKTOP;
    gsap.to(rig, {
      rotateY: 0,
      rotateX: 0,
      x: 0,
      scale: 1,
      duration: camera.settleDuration,
      ease: "power3.out",
      clearProps: "transform",
      onComplete: () => {
        settlingRef.current = false;
        setResting(false);
        onSettled?.();
      },
    });
  });

  return (
    <div ref={rigRef} className="book-camera">
      {children}
      {resting && (
        <button
          type="button"
          className="camera-unlock"
          onClick={straighten}
          aria-label={unlockLabel}
        >
          <span>{unlockLabel}</span>
        </button>
      )}
    </div>
  );
}
