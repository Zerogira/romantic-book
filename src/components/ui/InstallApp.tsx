import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { isIOS, isStandalone } from "../../lib/device";
import "../../styles/extras.css";

// O Chrome (Android) avisa que o site pode ser instalado; guardamos o aviso para usar no botão.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

/** Botão "Adicionar à tela inicial" e a folha com as instruções. Some quando o site já é um app. */
export function InstallApp() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const update = () => force((n) => n + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (isStandalone()) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    setOpen(false);
    force((n) => n + 1);
  };

  return (
    <>
      <button type="button" className="music-toggle" onClick={() => setOpen(true)}>
        <Download size={15} />
        <span>Adicionar à tela inicial</span>
      </button>

      {open && (
        <div className="install-sheet" role="dialog" aria-label="Adicionar à tela inicial">
          <h3>Abrir como um aplicativo</h3>
          {deferredPrompt ? (
            <p>Instale o livro no celular: ele abre em tela cheia, sem a barra do navegador.</p>
          ) : isIOS() ? (
            <>
              <p>No iPhone, para abrir em tela cheia:</p>
              <ol>
                <li>Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima).</li>
                <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> e abra o livro pelo novo ícone.</li>
              </ol>
            </>
          ) : (
            <>
              <p>Para abrir em tela cheia:</p>
              <ol>
                <li>Abra o menu do navegador (os três pontinhos).</li>
                <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
              </ol>
            </>
          )}
          <div className="install-actions">
            <button type="button" className="cam-btn" onClick={() => setOpen(false)}>
              Fechar
            </button>
            {deferredPrompt && (
              <button type="button" className="cam-btn cam-btn-primary" onClick={install}>
                Instalar agora
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
