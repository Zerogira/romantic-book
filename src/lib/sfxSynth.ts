// Sintetizador dos efeitos sonoros do livro. Funções puras (sem DOM nem Howler), para poderem
// rodar no site e também no script scripts/export-sfx.mjs, que gera .wav para ouvir fora do site.
// Tudo é gerado por código: não há arquivo de áudio de terceiros nem direitos autorais.

export const SFX_RATE = 22050;

const TWO_PI = Math.PI * 2;

/** Normaliza para um pico fixo (assim o volume de cada som é previsível) e converte para 16 bits. */
function toInt16(samples: Float32Array, peak: number): Int16Array {
  let max = 1e-9;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const gain = peak / max;
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i] * gain)) * 32767;
  return out;
}

/** Empacota amostras de 16 bits (mono) em um arquivo WAV. */
export function encodeWav(samples: Int16Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SFX_RATE, true);
  view.setUint32(28, SFX_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, s, true));
  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Um "chuááá" macio de papel: ruído suavizado cuja faixa sobe de grave para médio,
 * com ataque lento (sem estalo no começo) e queda longa. É a base de tudo que soa a página.
 */
function swish(duration: number, fromHz: number, toHz: number, decay: number, flutterHz: number): Float32Array {
  const n = Math.floor(SFX_RATE * duration);
  const out = new Float32Array(n);
  let a1 = 0;
  let a2 = 0;
  let slow = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const white = Math.random() * 2 - 1;
    // Faixa do filtro sobe durante a virada (o "movimento" do papel)
    const fc = fromHz + (toHz - fromHz) * Math.min(1, t / (duration * 0.55));
    const k = 1 - Math.exp((-TWO_PI * fc) / SFX_RATE);
    a1 += k * (white - a1);
    a2 += k * (a1 - a2); // duas etapas: corta o chiado agudo (o que dava aspecto de "tiro")
    slow += 0.02 * (a2 - slow); // tira o rumor grave
    const band = a2 - slow;
    const attack = 1 - Math.exp(-t * 48); // ~50 ms para chegar ao máximo: sem estalo
    const envelope = attack * Math.exp(-t * decay);
    const flutter = 0.86 + 0.14 * Math.sin(TWO_PI * flutterHz * t);
    out[i] = band * envelope * flutter;
  }
  return out;
}

/** Virar uma página: um "chuá" curto e macio. */
export function synthPageTurn(): Int16Array {
  return toInt16(swish(0.5, 900, 2800, 7, 11), 0.55);
}

/**
 * Folhear rápido de volta à capa: uma sequência de viradas curtas, uma só faixa de áudio.
 * Tocar o som de "virar página" onze vezes seguidas soaria como rajada de tiros; assim fica um folhear contínuo.
 */
export function synthRiffle(pages = 11, spacing = 0.15): Int16Array {
  const total = Math.floor(SFX_RATE * (pages * spacing + 0.5));
  const mix = new Float32Array(total);
  for (let p = 0; p < pages; p++) {
    const start = Math.floor(p * spacing * SFX_RATE);
    const piece = swish(0.3, 800 + Math.random() * 500, 2200 + Math.random() * 1200, 11, 14 + Math.random() * 6);
    const gain = 0.65 + Math.random() * 0.35;
    for (let i = 0; i < piece.length && start + i < total; i++) mix[start + i] += piece[i] * gain;
  }
  // Entra e sai suavemente
  const fadeIn = SFX_RATE * 0.08;
  const fadeOut = SFX_RATE * 0.45;
  for (let i = 0; i < total; i++) {
    const inGain = Math.min(1, i / fadeIn);
    const outGain = Math.min(1, (total - i) / fadeOut);
    mix[i] *= inGain * outGain;
  }
  return toInt16(mix, 0.5);
}

/** Livro se fechando: uma batida grave e macia, sem estalo. */
export function synthThud(): Int16Array {
  const n = Math.floor(SFX_RATE * 0.55);
  const out = new Float32Array(n);
  let air = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const attack = 1 - Math.exp(-t * 320); // sobe em ~10 ms
    const body = Math.sin(TWO_PI * (72 - 32 * t) * t) * Math.exp(-t * 9);
    air += 0.12 * ((Math.random() * 2 - 1) - air); // um sopro grave, bem baixo
    out[i] = attack * (body + air * Math.exp(-t * 20) * 0.35);
  }
  return toInt16(out, 0.6);
}

/** Selo de cera trincando: um toque seco mas curto e abafado (não um estalo agudo). */
export function synthPop(): Int16Array {
  const n = Math.floor(SFX_RATE * 0.22);
  const out = new Float32Array(n);
  let soft = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const white = Math.random() * 2 - 1;
    soft += 0.22 * (white - soft); // abafa os agudos
    const attack = 1 - Math.exp(-t * 600);
    const click = soft * Math.exp(-t * 55) * 0.6;
    const thump = Math.sin(TWO_PI * (170 - 300 * t) * t) * Math.exp(-t * 26) * 0.7;
    out[i] = attack * (click + thump);
  }
  return toInt16(out, 0.55);
}

/** Sininho suave de duas notas (sol e dó), com queda longa. */
export function synthChime(): Int16Array {
  const n = Math.floor(SFX_RATE * 1.5);
  const out = new Float32Array(n);
  const bell = (frequency: number, start: number, gain: number) => {
    for (let i = Math.floor(start * SFX_RATE); i < n; i++) {
      const t = i / SFX_RATE - start;
      const attack = 1 - Math.exp(-t * 220);
      out[i] +=
        attack *
        gain *
        (Math.sin(TWO_PI * frequency * t) * Math.exp(-t * 3.4) +
          0.45 * Math.sin(TWO_PI * frequency * 1.5 * t) * Math.exp(-t * 4.8) +
          0.2 * Math.sin(TWO_PI * frequency * 2 * t) * Math.exp(-t * 6.5));
    }
  };
  bell(784, 0, 0.5);
  bell(1047, 0.17, 0.45);
  return toInt16(out, 0.6);
}
