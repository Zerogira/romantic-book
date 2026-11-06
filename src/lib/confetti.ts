import confetti from "canvas-confetti";

/*
 * Confete em uma tela (canvas) própria, desenhada em um Web Worker (OffscreenCanvas).
 * Assim a animação não disputa o processamento principal com o resto do site, que é
 * o que fazia o celular travar. Onde o navegador não suporta worker, a biblioteca desenha
 * normalmente na tela principal.
 */
let instance: confetti.CreateTypes | null = null;

function getInstance(): confetti.CreateTypes {
  if (instance) return instance;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  // Acima das telas cheias do site (câmera, carta, envelope, zoom), sem atrapalhar toques
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:700";
  document.body.appendChild(canvas);
  instance = confetti.create(canvas, { resize: true, useWorker: true });
  return instance;
}

export function fireConfetti(options: confetti.Options) {
  return getInstance()(options);
}
