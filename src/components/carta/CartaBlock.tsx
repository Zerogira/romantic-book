import { PenLine } from "lucide-react";
import { formatRegistroDate } from "../../lib/registro";
import { useCarta } from "./CartaProvider";
import "../../styles/extras.css";

/** Tamanho da letra conforme o tamanho da carta, para caber na página. */
function fontSizeFor(length: number): number {
  if (length <= 350) return 22;
  if (length <= 700) return 19;
  return 16;
}

/** Conteúdo da página da carta de resposta: convite para escrever, ou a carta já guardada. */
export function CartaBlock() {
  const { letter, loading, uploadFailed, openEditor, retryUpload } = useCarta();

  if (letter) {
    return (
      <div className="carta-block">
        <div className="carta-paper" style={{ fontSize: fontSizeFor(letter.text.length) }}>
          {letter.text}
        </div>
        <span className="carta-date">escrita em {formatRegistroDate(letter.writtenAt)}</span>
        {!letter.synced && (
          <p className="registro-note">
            {uploadFailed ? "Ainda não consegui guardar online." : "Guardando…"}{" "}
            {uploadFailed && (
              <button type="button" className="registro-link" onClick={retryUpload}>
                Tentar de novo
              </button>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="carta-block">
      <div className="carta-paper is-empty" aria-busy={loading}>
        <PenLine size={26} />
        <span>{loading ? "…" : "sua carta vai ficar aqui"}</span>
      </div>
      <button type="button" className="registro-cta" onClick={openEditor} disabled={loading}>
        <PenLine size={16} /> Escrever minha carta
      </button>
    </div>
  );
}
