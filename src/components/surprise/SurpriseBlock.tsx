import { lazy, Suspense, useState } from "react";
import { Heart } from "lucide-react";
import "../../styles/surprise.css";

// A tela do envelope só é baixada quando alguém a abre
const SurpriseEnvelope = lazy(() => import("./SurpriseEnvelope"));

const SEEN_KEY = "romantic_book_surprise_seen_v1";

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

      {seen && (
        <div className="secret-message">
          <p>“{message}”</p>
          <small>Te amo infinitamente! ✨</small>
        </div>
      )}

      {open && (
        <Suspense fallback={null}>
          <SurpriseEnvelope
            message={message}
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
