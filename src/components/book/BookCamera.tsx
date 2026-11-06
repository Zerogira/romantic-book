import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePrefersReducedMotion } from "../../lib/motion";
import { isMobileNow } from "../../lib/device";

/*
 * "Câmera de cinema" da abertura: o livro começa inclinado para a esquerda,
 * desliza até ficar inclinado para a direita, e fica assim até o primeiro toque do
 * leitor, que o endireita e libera o folhear.
 *
 * Computador: movimento em 3D (giro no eixo Y).
 * Celular: movimento só em 2D (deslocar, girar de leve e dar zoom). O 3D de um livro
 * inteiro, com várias camadas e sombras, trava em muitos celulares; o 2D roda liso
 * porque é só mover uma camada que já está pronta.
 *
 * Os valores ficam aqui para ajustar o gosto sem mexer na lógica.
 */
const CAMERA_DESKTOP = {
  start: { rotateY: -30, rotateX: 7, x: -90, scale: 0.9 },
  end: { rotateY: 26, rotateX: 3, x: 50, scale: 1.02 },
  moveDuration: 2.8,
  settleDuration: 1.1,
};

const CAMERA_MOBILE = {
  start: { rotation: -4, x: -28, y: 10, scale: 0.9 },
  end: { rotation: 3, x: 16, y: 0, scale: 0.99 },
  moveDuration: 2.2,
  settleDuration: 0.8,
};

type Props = {
  children: ReactNode;
  /** A câmera só começa quando isto vira true (o livro já fica montado, escondido, antes). */
  play: boolean;
  /** Texto do aviso sobre o livro inclinado. */
  unlockLabel?: string;
  /** Chamado dentro do toque do usuário. */
  onUnlock?: () => void;
  /** Chamado quando o livro terminou de se endireitar. */
  onSettled?: () => void;
  /** Espera (segundos) antes da câmera começar, para a transição de entrada terminar. */
  startDelay?: number;
};

export function BookCamera({ children, play, unlockLabel = "Toque para começar", onUnlock, onSettled, startDelay = 0 }: Props) {
  const rigRef = useRef<HTMLDivElement | null>(null);
  const settlingRef = useRef(false);
  const [resting, setResting] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const { contextSafe } = useGSAP(
    () => {
      const rig = rigRef.current;
      if (!rig) return;
      if (!play) {
        setResting(false);
        return;
      }
      if (reducedMotion) return;
      const camera = isMobileNow() ? CAMERA_MOBILE : CAMERA_DESKTOP;

      // Durante o movimento o hit-test do page-flip fica incorreto (o livro está
      // transformado), então bloqueamos os cliques até a câmera parar.
      // Só começa depois do atraso: primeiro o livro aparece com o fade suave,
      // e só então a câmera se move. immediateRender:false mantém o livro reto até lá.
      gsap.timeline({
        delay: startDelay,
        onStart: () => {
          rig.style.pointerEvents = "none";
          rig.style.willChange = "transform"; // camada própria só enquanto se move
        },
        onComplete: () => {
          rig.style.pointerEvents = "";
          setResting(true);
        },
      }).fromTo(rig, { ...camera.start }, {
        ...camera.end,
        duration: camera.moveDuration,
        ease: "power2.inOut",
        immediateRender: false,
      });

      // Ao desligar (voltar ao início): limpa tudo
      return () => {
        rig.style.pointerEvents = "";
        rig.style.willChange = "";
      };
    },
    { scope: rigRef, dependencies: [play, reducedMotion, startDelay] }
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
      rotation: 0,
      x: 0,
      y: 0,
      scale: 1,
      duration: camera.settleDuration,
      ease: "power3.out",
      clearProps: "transform",
      onComplete: () => {
        rig.style.willChange = "";
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
