import confetti from "canvas-confetti";
import { fireConfetti } from "./confetti";

// Coração (ícone Material) usado como partícula de confete
export const HEART_SHAPE = confetti.shapeFromPath({
  path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
});

/** Solta corações a partir de um ponto da tela (em pixels). */
export function burstHearts(x: number, y: number, count = 12) {
  fireConfetti({
    particleCount: count,
    spread: 80,
    startVelocity: 18,
    gravity: 0.6,
    ticks: 110,
    scalar: 1.6,
    shapes: [HEART_SHAPE],
    colors: ["#e17b8f", "#f497a9", "#fcd0db", "#c0405a"],
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
  });
}
