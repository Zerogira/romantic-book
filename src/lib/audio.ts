import { Howl } from "howler";

/**
 * Caminho da música dentro de /public. Troque pelo arquivo final
 * (ex.: "/music/nossa-cancao.mp3") quando ele estiver na pasta.
 */
export const MUSIC_SRC = "/music/cancao.mp3";

const VOLUME = 0.5;
const FADE_MS = 1500;
const MUTE_KEY = "romantic_book_music_muted_v1";

let howl: Howl | null = null;
let failed = false;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(value: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {}
}

/** Cria o Howl uma única vez. Se o arquivo não existir, marca como indisponível. */
function getHowl(): Howl | null {
  if (failed) return null;
  if (!howl) {
    howl = new Howl({
      src: [MUSIC_SRC],
      loop: true,
      volume: 0,
      preload: true,
      onloaderror: () => {
        failed = true;
        console.warn(`Música não encontrada em ${MUSIC_SRC}. Coloque o arquivo para ativar.`);
      },
      onplayerror: (_id, err) => {
        console.warn("Não foi possível tocar a música:", err);
      },
    });
  }
  return howl;
}

export const music = {
  isAvailable(): boolean {
    return !failed;
  },

  isMuted: readMuted,

  setMuted(value: boolean) {
    writeMuted(value);
    if (value) this.fadeOut();
  },

  /**
   * Deve ser chamado DIRETAMENTE dentro do onClick do usuário, de forma síncrona.
   * Navegadores bloqueiam áudio iniciado fora de um gesto.
   */
  start() {
    if (readMuted()) return;
    const h = getHowl();
    if (!h || h.playing()) return;
    h.play();
    h.fade(0, VOLUME, FADE_MS);
  },

  fadeOut() {
    const h = getHowl();
    if (!h || !h.playing()) return;
    h.fade(h.volume(), 0, FADE_MS);
    h.once("fade", () => {
      if (h.volume() === 0) h.pause();
    });
  },
};

// ---------------------------------------------------------------------------
// Efeitos sonoros (virar página, estalo do selo, sininho), gerados no próprio
// navegador: não há arquivo de áudio para baixar nem direitos autorais envolvidos.
// Todos respeitam o botão de música (se estiver mudo, ficam em silêncio).
// ---------------------------------------------------------------------------

const SFX_RATE = 22050;

const toInt16 = (value: number) => Math.max(-1, Math.min(1, value)) * 32767;

/** Empacota amostras de 16 bits (mono) em um arquivo WAV. */
function encodeWav(samples: Int16Array): Blob {
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

/** "ffff" curto de papel: ruído filtrado com ataque rápido e queda suave. */
function synthPageTurn(): Int16Array {
  const n = Math.floor(SFX_RATE * 0.42);
  const samples = new Int16Array(n);
  let slow = 0;
  let fast = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const white = Math.random() * 2 - 1;
    fast += 0.55 * (white - fast); // tira o chiado mais agudo
    slow += 0.07 * (white - slow); // tira os graves
    const band = fast - slow; // sobra a faixa do "papel"
    const envelope = (1 - Math.exp(-t * 140)) * Math.exp(-t * 7.5) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 17 * t));
    samples[i] = toInt16(band * envelope * 2.4);
  }
  return samples;
}

/** Estalo do selo de cera: um clique seco somado a uma batida grave e curta. */
function synthPop(): Int16Array {
  const n = Math.floor(SFX_RATE * 0.18);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 110) * 0.55;
    const thump = Math.sin(2 * Math.PI * (200 - 450 * t) * t) * Math.exp(-t * 30) * 0.85;
    samples[i] = toInt16(click + thump);
  }
  return samples;
}

/** Sininho suave de duas notas (sol e dó), com queda longa. */
function synthChime(): Int16Array {
  const n = Math.floor(SFX_RATE * 1.5);
  const samples = new Float32Array(n);
  const bell = (frequency: number, start: number, gain: number) => {
    for (let i = Math.floor(start * SFX_RATE); i < n; i++) {
      const t = i / SFX_RATE - start;
      const attack = 1 - Math.exp(-t * 220);
      samples[i] +=
        attack *
        gain *
        (Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 3.4) +
          0.45 * Math.sin(2 * Math.PI * frequency * 1.5 * t) * Math.exp(-t * 4.8) +
          0.2 * Math.sin(2 * Math.PI * frequency * 2 * t) * Math.exp(-t * 6.5));
    }
  };
  bell(784, 0, 0.5);
  bell(1047, 0.17, 0.45);
  return Int16Array.from(samples, toInt16);
}

/** Batida grave e macia, como um livro sendo fechado sobre a mesa. */
function synthThud(): Int16Array {
  const n = Math.floor(SFX_RATE * 0.4);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SFX_RATE;
    const body = Math.sin(2 * Math.PI * (85 - 45 * t) * t) * Math.exp(-t * 11);
    const air = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.25;
    samples[i] = toInt16((body + air) * 0.9);
  }
  return samples;
}

const sfxHowls = new Map<string, Howl>();

function playSfx(key: string, make: () => Int16Array, volume: number) {
  if (readMuted()) return;
  try {
    let howl = sfxHowls.get(key);
    if (!howl) {
      howl = new Howl({ src: [URL.createObjectURL(encodeWav(make()))], format: ["wav"], volume });
      sfxHowls.set(key, howl);
    }
    howl.play();
  } catch {
    // som é só um enfeite: nunca pode quebrar a leitura
  }
}

export const sfx = {
  /** Som de virar página. */
  pageTurn() {
    playSfx("page", synthPageTurn, 0.2);
  },
  /** Estalo do selo de cera ao quebrar. */
  pop() {
    playSfx("pop", synthPop, 0.3);
  },
  /** Livro se fechando (última página). */
  close() {
    playSfx("close", synthThud, 0.35);
  },
  /** Sininho ao abrir a surpresa. */
  chime() {
    playSfx("chime", synthChime, 0.25);
  },
};
