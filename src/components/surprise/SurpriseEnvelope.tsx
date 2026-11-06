import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Heart, X } from "lucide-react";
import { HandwrittenText } from "../ui/HandwrittenText";
import { sfx } from "../../lib/audio";
import { burstHearts } from "../../lib/hearts";
import { usePrefersReducedMotion } from "../../lib/motion";
import "../../styles/surprise.css";

gsap.registerPlugin(useGSAP);

type Props = {
  message: string;
  /** Chamado quando o envelope termina de abrir (para lembrar que ela já viu). */
  onOpened: () => void;
  onClose: () => void;
};

type Stage = "closed" | "opening" | "open";

/**
 * Surpresa em tela cheia: um envelope com selo de cera. Ao tocar no selo, ele estala, a aba
 * abre, a carta sobe e a promessa se escreve sozinha.
 *
 * Fica num portal (document.body) de propósito: dentro da página do livro, os efeitos 3D
 * das páginas quebrariam o "position: fixed".
 */
export default function SurpriseEnvelope({ message, onOpened, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sealRef = useRef<HTMLButtonElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [stage, setStage] = useState<Stage>("closed");
  const [written, setWritten] = useState(false);
  const { contextSafe } = useGSAP({ scope: rootRef });

  useEffect(() => {
    sealRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const centerOf = (el: Element | null) => {
    const rect = el?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const openEnvelope = contextSafe(() => {
    if (stage !== "closed") return;
    setStage("opening");

    // Tudo isto acontece dentro do toque dela (necessário para o som no celular)
    sfx.pop();
    navigator.vibrate?.(15);

    const root = rootRef.current;
    const seal = root?.querySelector(".env-seal") ?? null;
    const flap = root?.querySelector(".env-flap") ?? null;
    const letter = root?.querySelector(".env-letter") ?? null;

    const finish = () => {
      setStage("open");
      setWritten(true);
      onOpened();
      sfx.chime();
      navigator.vibrate?.([10, 40, 10]);
      const p = centerOf(letter);
      burstHearts(p.x, p.y - 40, 16);
    };

    if (reducedMotion) {
      // Sem movimento: já mostra o envelope aberto
      gsap.set(seal, { opacity: 0 });
      gsap.set(flap, { rotateX: -180, zIndex: 1 });
      gsap.set(letter, { yPercent: -80 });
      finish();
      return;
    }

    const sealCenter = centerOf(seal);
    gsap
      .timeline({ onComplete: finish })
      // O selo treme e estala
      .to(seal, { x: 3, duration: 0.05, repeat: 7, yoyo: true, ease: "none" })
      .to(seal, { scale: 1.35, opacity: 0, duration: 0.28, ease: "power2.out" })
      .call(() => burstHearts(sealCenter.x, sealCenter.y, 8))
      // A aba abre (passa por "de lado" e vai para trás do envelope)
      .to(flap, { rotateX: -90, duration: 0.35, ease: "power1.in" }, "-=0.1")
      .set(flap, { zIndex: 1 })
      .to(flap, { rotateX: -180, duration: 0.35, ease: "power1.out" })
      // A carta sobe para fora do envelope
      .to(letter, { yPercent: -80, duration: 1, ease: "power2.out" }, "-=0.15");
  });

  const overlay = (
    <div ref={rootRef} className="env-overlay" role="dialog" aria-modal="true" aria-label="Surpresa">
      <button type="button" className="env-close" onClick={onClose} aria-label="Fechar">
        <X size={20} />
      </button>

      <div className="env-scene">
        <div className="env-envelope">
          <div className="env-back" />

          <div className="env-letter">
            <span className="env-letter-label">Nossa promessa</span>
            <p className="env-letter-text">
              <HandwrittenText text={`“${message}”`} active={written} />
            </p>
            <small className="env-letter-sign">Te amo infinitamente! ✨</small>
          </div>

          <div className="env-front" />
          <div className="env-flap" />

          <button
            ref={sealRef}
            type="button"
            className="env-seal"
            onClick={openEnvelope}
            disabled={stage !== "closed"}
            aria-label="Quebrar o selo e abrir o envelope"
          >
            <Heart size={22} fill="currentColor" />
          </button>
        </div>

        {stage === "closed" && <p className="env-hint">Toque no selo</p>}
        {stage === "open" && (
          <button type="button" className="cam-btn cam-btn-primary env-done" onClick={onClose}>
            <Heart size={16} fill="currentColor" /> Guardar com carinho
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
