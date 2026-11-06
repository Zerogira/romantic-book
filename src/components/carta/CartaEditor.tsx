import { useEffect, useRef, useState } from "react";
import { Heart, X } from "lucide-react";
import { CARTA_MAX_CHARS, readDraft, writeDraft } from "../../lib/carta";
import type { CartaSaveOutcome } from "./CartaProvider";
import "../../styles/extras.css";

type Phase = "writing" | "confirm" | "saving" | "done";

type Props = {
  onSave: (text: string) => Promise<CartaSaveOutcome>;
  onClose: () => void;
};

export default function CartaEditor({ onSave, onClose }: Props) {
  const [text, setText] = useState(() => readDraft());
  const [phase, setPhase] = useState<Phase>("writing");
  const [outcome, setOutcome] = useState<CartaSaveOutcome | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const trimmed = text.trim();

  // Guarda o rascunho enquanto ela escreve: se fechar sem querer, o texto não se perde
  useEffect(() => {
    const id = window.setTimeout(() => writeDraft(text), 300);
    return () => window.clearTimeout(id);
  }, [text]);

  // Teclado do celular: a tela acompanha a área realmente visível
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewportHeight(vv.height);
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "saving") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const confirmSave = async () => {
    setPhase("saving");
    const result = await onSave(trimmed);
    writeDraft("");
    setOutcome(result);
    setPhase("done");
  };

  return (
    <div
      className="carta-overlay"
      style={viewportHeight ? { height: viewportHeight } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Escrever a carta"
    >
      <button type="button" className="carta-close" onClick={onClose} disabled={phase === "saving"} aria-label="Fechar">
        <X size={20} />
      </button>

      <div className="carta-sheet">
        {phase === "done" ? (
          <div className="carta-done">
            <Heart size={28} fill="currentColor" />
            <p>
              {outcome === "saved"
                ? "Pronto! Sua carta ficou guardada no livro ♡"
                : "Guardei no seu celular e vou tentar enviar de novo assim que a conexão voltar ♡"}
            </p>
            <button type="button" className="cam-btn cam-btn-primary" onClick={onClose}>
              Ver no livro
            </button>
          </div>
        ) : (
          <>
            <h2 className="carta-title">Sua carta para mim</h2>
            <textarea
              ref={areaRef}
              className="carta-textarea"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, CARTA_MAX_CHARS))}
              placeholder="Escreva aqui, do seu jeito…"
              disabled={phase !== "writing"}
              maxLength={CARTA_MAX_CHARS}
            />
            <div className="carta-meta">
              <span>
                {text.length}/{CARTA_MAX_CHARS}
              </span>
            </div>

            {phase === "writing" && (
              <button
                type="button"
                className="cam-btn cam-btn-primary carta-submit"
                onClick={() => setPhase("confirm")}
                disabled={trimmed.length === 0}
              >
                Guardar no livro
              </button>
            )}

            {phase === "confirm" && (
              <div className="carta-confirm">
                <p>Depois de guardada, a carta não pode mais ser editada. Guardar mesmo assim?</p>
                <div className="carta-confirm-actions">
                  <button type="button" className="cam-btn" onClick={() => setPhase("writing")}>
                    Voltar a escrever
                  </button>
                  <button type="button" className="cam-btn cam-btn-primary" onClick={confirmSave}>
                    Sim, guardar
                  </button>
                </div>
              </div>
            )}

            {phase === "saving" && (
              <span className="cam-saving carta-saving">
                <Heart size={16} fill="currentColor" /> guardando…
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
