import { useState } from "react";
import { X } from "lucide-react";
import { isMobileNow, isStandalone } from "../../lib/device";
import { supportsFullscreen } from "../../lib/fullscreen";
import "../../styles/extras.css";

const KEY = "romantic_book_ios_tip_v1";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * No iPhone nenhum navegador consegue colocar uma página em tela cheia: a única forma é
 * adicionar o site à tela inicial e abrir pelo ícone. Esta dica aparece só onde isso vale
 * (celular sem a API de tela cheia, e que ainda não está em modo app).
 */
export function IosFullscreenTip() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed || !isMobileNow() || supportsFullscreen() || isStandalone()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  return (
    <div className="ios-tip" role="note">
      <span>
        Para abrir em tela cheia: toque em <strong>Compartilhar</strong> e depois em{" "}
        <strong>Adicionar à Tela de Início</strong>.
      </span>
      <button type="button" onClick={dismiss} aria-label="Fechar a dica">
        <X size={16} />
      </button>
    </div>
  );
}
