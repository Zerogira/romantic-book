import { Camera } from "lucide-react";
import { formatRegistroDate } from "../../lib/registro";
import { useRegistro } from "./RegistroProvider";
import "../../styles/registro.css";

/** Conteúdo da última página do livro: convite para tirar a foto, ou a polaroid já tirada. */
export function RegistroBlock() {
  const { photo, loading, uploadFailed, openCamera, retryUpload } = useRegistro();

  if (photo) {
    return (
      <div className="registro-block">
        <figure className="registro-polaroid">
          <span className="registro-tape" />
          <img src={photo.src} alt="Nossa foto do dia" />
          <figcaption>{formatRegistroDate(photo.takenAt)}</figcaption>
        </figure>
        {!photo.synced && (
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
    <div className="registro-block">
      <figure className="registro-polaroid is-empty" aria-busy={loading}>
        <span className="registro-tape" />
        <div className="registro-empty-photo">
          <Camera size={28} />
          <span>{loading ? "…" : "sua foto vai ficar aqui"}</span>
        </div>
        <figcaption>&nbsp;</figcaption>
      </figure>
      <button type="button" className="registro-cta" onClick={openCamera} disabled={loading}>
        <Camera size={16} /> Tirar nossa foto
      </button>
    </div>
  );
}
