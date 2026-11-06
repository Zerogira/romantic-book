import { useState } from "react";
import { Camera, Download } from "lucide-react";
import { formatRegistroDate } from "../../lib/registro";
import { renderPolaroidBlob, shareOrDownload } from "../../lib/polaroid";
import { ZoomPhoto } from "../ui/ZoomPhoto";
import { useRegistro } from "./RegistroProvider";
import "../../styles/registro.css";

type SaveState = "idle" | "working" | "done" | "error";

/** Conteúdo da página do registro: convite para tirar a foto, ou a polaroid já tirada. */
export function RegistroBlock() {
  const { photo, loading, uploadFailed, openCamera, retryUpload } = useRegistro();
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const saveAsImage = async () => {
    if (!photo || saveState === "working") return;
    setSaveState("working");
    try {
      // Foto já enviada: usa a cópia do mesmo domínio (sem depender de CORS). Pendente: a própria imagem.
      const source = photo.synced ? `/api/registro?img=1&v=${encodeURIComponent(photo.takenAt)}` : photo.src;
      const blob = await renderPolaroidBlob(source, formatRegistroDate(photo.takenAt));
      const result = await shareOrDownload(blob, "nossa-polaroid.png", "Nossa polaroid");
      setSaveState(result === "cancelled" ? "idle" : "done");
    } catch {
      setSaveState("error");
    }
  };

  if (photo) {
    return (
      <div className="registro-block">
        <figure className="registro-polaroid">
          <span className="registro-tape" />
          <ZoomPhoto src={photo.src} alt="Nossa foto do dia" />
          <figcaption>{formatRegistroDate(photo.takenAt)}</figcaption>
        </figure>

        <button type="button" className="registro-save" onClick={saveAsImage} disabled={saveState === "working"}>
          <Download size={14} />
          {saveState === "working"
            ? "Preparando…"
            : saveState === "done"
              ? "Pronto! Salvar de novo"
              : saveState === "error"
                ? "Não deu certo. Tentar de novo"
                : "Salvar como imagem"}
        </button>

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
