import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Heart, X } from "lucide-react";
import { HandwrittenText } from "../ui/HandwrittenText";
import { sfx } from "../../lib/audio";
import { burstHearts } from "../../lib/hearts";
import { usePrefersReducedMotion } from "../../lib/motion";
import { SIGNERS, type SignerId, type Signatures } from "../../lib/assinatura";
import SignaturePad from "./SignaturePad";
import "../../styles/surprise.css";

gsap.registerPlugin(useGSAP);

type Props = {
  message: string;
  /** Assinaturas (o estado fica no SurpriseBlock, para a página mostrar as mesmas). */
  signatures: Signatures;
  onSign: (who: SignerId, image: string) => Promise<void>;
  /** A segunda assinatura vai entrar: a página já reserva o lugar do cartão, ainda invisível. */
  onSealStart: () => void;
  /** A carta pousou na página: o cartão aparece. */
  onSealLanded: () => void;
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
export default function SurpriseEnvelope({ message, signatures, onSign, onSealStart, onSealLanded, onOpened, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sealRef = useRef<HTMLButtonElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [stage, setStage] = useState<Stage>("closed");
  const [written, setWritten] = useState(false);
  const { contextSafe } = useGSAP({ scope: rootRef });
  const [padFor, setPadFor] = useState<SignerId | null>(null); // quem está assinando agora
  const padOpenRef = useRef(false);
  padOpenRef.current = padFor !== null;

  useEffect(() => {
    sealRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Com a folha de assinatura aberta, o Esc só fecha a folha
      if (e.key === "Escape" && !padOpenRef.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Com o envelope aberto, a carta sobe por inteiro para mostrar também o rodapé com as assinaturas
  useEffect(() => {
    if (stage !== "open") return;
    const letter = rootRef.current?.querySelector(".env-letter");
    if (!letter) return;
    if (reducedMotion) gsap.set(letter, { yPercent: -100 });
    else gsap.to(letter, { yPercent: -100, duration: 0.6, ease: "power2.out" });
  }, [stage, reducedMotion]);

  /**
   * Os dois assinaram: depois de um instante para ver as duas assinaturas, a carta encolhe e voa
   * até o cartão que acabou de aparecer na página; a tela cheia some e o cartão pousa no lugar.
   * Sem movimento (ou se o cartão não for encontrado), só fecha e mostra o cartão.
   */
  const flyToPage = async () => {
    const root = rootRef.current;
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const letter = root?.querySelector<HTMLElement>(".env-letter");
    const target = document.querySelector<HTMLElement>(".sealed-card");
    if (!root || !letter || !target || reducedMotion) {
      onSealLanded();
      onClose();
      return;
    }

    const from = letter.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    // Uma cópia da carta, solta sobre tudo, faz o voo (a original fica invisível)
    const flying = letter.cloneNode(true) as HTMLElement;
    Object.assign(flying.style, {
      position: "fixed",
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      minHeight: "0",
      margin: "0",
      transform: "none",
      transformOrigin: "0 0",
      zIndex: "560",
      pointerEvents: "none",
    });
    document.body.appendChild(flying);
    gsap.set(letter, { opacity: 0 });

    const scale = Math.min(to.width / from.width, to.height / from.height);
    const x = to.left + (to.width - from.width * scale) / 2 - from.left;
    const y = to.top + (to.height - from.height * scale) / 2 - from.top;
    const hide = root.querySelectorAll(".env-envelope, .env-done, .env-close, .env-hint");

    gsap
      .timeline({
        onComplete: () => {
          flying.remove();
          onClose();
        },
      })
      .to(hide, { opacity: 0, duration: 0.35, ease: "power1.out" }, 0)
      .to(flying, { x, y, scale, rotation: -1, duration: 1.05, ease: "power3.inOut" }, 0.1)
      // o fundo da tela cheia some, e a página aparece por baixo
      .to(root, { opacity: 0, duration: 0.7, ease: "power1.in" }, 0.45)
      // a carta se encaixa no cartão da página
      .call(() => {
        onSealLanded();
        sfx.chime();
        navigator.vibrate?.([10, 40, 10]);
      }, undefined, 1.1)
      .to(flying, { opacity: 0, duration: 0.25, ease: "power1.out" }, 1.1);
  };

  const confirmSignature = (image: string) => {
    const who = padFor;
    setPadFor(null);
    if (!who) return;
    // Esta é a segunda assinatura? Então a promessa fica selada e a carta vai para a página
    const seals = SIGNERS.every((s) => s.id === who || signatures[s.id]);
    sfx.pop();
    navigator.vibrate?.(15);
    burstHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
    if (seals) onSealStart(); // junto da assinatura: o cartão já nasce reservado (invisível)
    void onSign(who, image);
    if (seals) void flyToPage();
  };

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

          <div className={`env-letter ${stage === "open" ? "is-open" : ""}`}>
            <span className="env-letter-label">Nossa promessa</span>
            <p className="env-letter-text">
              <HandwrittenText text={`“${message}”`} active={written} />
            </p>
            <small className="env-letter-sign">Te amo infinitamente! ✨</small>

            {/* Rodapé da carta: cada um assina com o dedo (as assinaturas ficam salvas) */}
            <div className="env-signatures">
              {SIGNERS.map(({ id, label }) => {
                const signature = signatures[id];
                return (
                  <div key={id} className="env-sig">
                    <span className="env-sig-label">{label}:</span>
                    {signature ? (
                      <img className="env-sig-img" src={signature.image} alt={`Assinatura de ${label}`} />
                    ) : (
                      <button
                        type="button"
                        className="env-sig-slot"
                        disabled={stage !== "open"}
                        onClick={() => setPadFor(id)}
                        aria-label={`Assinar como ${label}`}
                      >
                        toque para assinar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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

      {padFor && (
        <SignaturePad
          name={SIGNERS.find((s) => s.id === padFor)?.label ?? ""}
          onCancel={() => setPadFor(null)}
          onConfirm={confirmSignature}
        />
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
