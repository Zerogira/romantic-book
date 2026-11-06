// Gera os sons do livro como arquivos .wav na pasta sons-teste/, para ouvir (e comparar) fora do site.
// Uso: node scripts/export-sfx.mjs   (precisa do Node 22.18+; o Node 24 já roda arquivos .ts)
import { mkdirSync, writeFileSync } from "node:fs";
import {
  SFX_RATE,
  encodeWav,
  synthChime,
  synthPageTurn,
  synthPop,
  synthRiffle,
  synthThud,
} from "../src/lib/sfxSynth.ts";

// ---- Som ANTIGO de virar página, só para comparar (era um ruído com ataque muito rápido) ----
function oldPageTurn() {
  const n = Math.floor(SFX_RATE * 0.42);
  const out = new Float32Array(n);
  let slow = 0;
  let fast = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const white = Math.random() * 2 - 1;
    fast += 0.55 * (white - fast);
    slow += 0.07 * (white - slow);
    const envelope = (1 - Math.exp(-t * 140)) * Math.exp(-t * 7.5) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 17 * t));
    out[i] = (fast - slow) * envelope * 2.4;
  }
  return Int16Array.from(out, (v) => Math.max(-1, Math.min(1, v)) * 32767);
}

function oldRapidFire(pages = 11, spacing = 0.15) {
  const one = oldPageTurn();
  const total = Math.floor(SFX_RATE * (pages * spacing)) + one.length;
  const mix = new Float32Array(total);
  for (let p = 0; p < pages; p++) {
    const start = Math.floor(p * spacing * SFX_RATE);
    for (let i = 0; i < one.length; i++) mix[start + i] += one[i] / 32767;
  }
  return Int16Array.from(mix, (v) => Math.max(-1, Math.min(1, v)) * 32767);
}

function stats(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  let attackIndex = 0;
  while (attackIndex < samples.length && Math.abs(samples[attackIndex]) < peak * 0.9) attackIndex++;
  return {
    duracao: `${(samples.length / SFX_RATE).toFixed(2)} s`,
    pico: `${((peak / 32767) * 100).toFixed(0)}%`,
    ataque_ate_90pct: `${((attackIndex / SFX_RATE) * 1000).toFixed(0)} ms`,
  };
}

const sounds = {
  "antigo-virar-pagina": oldPageTurn(),
  "antigo-folhear-rajada": oldRapidFire(),
  "novo-virar-pagina": synthPageTurn(),
  "novo-folhear-de-volta": synthRiffle(),
  "novo-livro-fechando": synthThud(),
  "novo-selo-estalo": synthPop(),
  "novo-sininho": synthChime(),
};

mkdirSync("sons-teste", { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(`sons-teste/${name}.wav`, Buffer.from(await encodeWav(samples).arrayBuffer()));
  console.log(name.padEnd(24), stats(samples));
}
console.log("\nArquivos em sons-teste/ (dê dois cliques para ouvir).");
