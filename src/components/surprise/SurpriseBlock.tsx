import { lazy, Suspense, useState } from "react";
import { Heart } from "lucide-react";
import { isSealed } from "../../lib/assinatura";
import { SealedCard } from "./SealedCard";
import { useAssinaturas } from "./useAssinaturas";
import "../../styles/surprise.css";

// A tela do envelope só é baixada quando alguém a abre
const SurpriseEnvelope = lazy(() => import("./SurpriseEnvelope"));

// Guarda no celular que o envelope já foi aberto. Ao mudar a versão, todos os aparelhos voltam ao início
// (o reset do servidor não mexe nisso).
const SEEN_KEY = "romantic_book_surprise_seen_v2";

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

type Props = { message: string };

/** Conteúdo da última página de "capítulos": envelope pequeno que abre a surpresa em tela cheia. */
export function SurpriseBlock({ message }: Props) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  // Assinaturas: ficam aqui para a página e a tela do envelope mostrarem as mesmas
  const { signatures, sign } = useAssinaturas();
  const sealed = isSealed(signatures);
  // true enquanto a carta assinada voa até a página: o cartão já ocupa o lugar, mas ainda invisível
  const [landing, setLanding] = useState(false);

  return (
    <>
      <button type="button" className="surprise-card" onClick={() => setOpen(true)}>
        <span className="env-mini" aria-hidden="true">
          <span className="env-mini-flap" />
          <span className="env-mini-seal">
            <Heart size={11} fill="currentColor" />
          </span>
        </span>
        <span className="surprise-card-label">{seen ? "Abrir o envelope de novo" : "Toque no selo para abrir a surpresa"}</span>
      </button>

      {sealed ? (
        <SealedCard message={message} signatures={signatures} hidden={landing} />
      ) : (
        seen && (
          <div className="secret-message">
            <p>“{message}”</p>
            <small>Te amo infinitamente! ✨</small>
          </div>
        )
      )}

      {open && (
        <Suspense fallback={null}>
          <SurpriseEnvelope
            message={message}
            signatures={signatures}
            onSign={sign}
            onSealStart={() => setLanding(true)}
            onSealLanded={() => setLanding(false)}
            onOpened={() => {
              writeSeen();
              setSeen(true);
            }}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
