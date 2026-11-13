import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// Só no servidor de desenvolvimento: o reset.bat grava um "token" no servidor de teste.
// Quando o token muda, este navegador apaga as cópias locais da foto, da carta, das assinaturas
// e do envelope, para o teste recomeçar do zero. Roda antes do app abrir (ele lê isso ao iniciar).
const RESET_SEEN_KEY = "dev_reset_token_seen";
const KEEP_PREFIXES = [
  "romantic_book_stickers", // rascunhos das figurinhas ainda não salvas no projeto
  "romantic_book_music_muted", // preferência de som
];

async function applyDevReset() {
  if (!import.meta.env.DEV) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("/__dev-reset", { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    const { token } = (await res.json()) as { token: string };
    if (localStorage.getItem(RESET_SEEN_KEY) === token) return;
    if (token !== "0") {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("romantic_book_") && !KEEP_PREFIXES.some((p) => key.startsWith(p))) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
    }
    localStorage.setItem(RESET_SEEN_KEY, token);
  } catch {
    // sem servidor de teste: segue normalmente
  }
}

applyDevReset().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
