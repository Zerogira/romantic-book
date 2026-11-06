import { Howl } from "howler";
import { encodeWav, synthChime, synthPageTurn, synthPop, synthRiffle, synthThud } from "./sfxSynth";

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
// Efeitos sonoros (virar página, folhear, batida do livro, estalo do selo, sininho), gerados
// no próprio navegador (veja sfxSynth.ts): não há arquivo de áudio para baixar nem direitos
// autorais envolvidos. Todos respeitam o botão de música (se estiver mudo, ficam em silêncio).
// ---------------------------------------------------------------------------

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
  /** Som de virar uma página. */
  pageTurn() {
    playSfx("page", synthPageTurn, 0.22);
  },
  /** Folhear rápido de volta à capa (um único som contínuo). */
  riffle() {
    playSfx("riffle", synthRiffle, 0.22);
  },
  /** Livro se fechando. */
  close() {
    playSfx("close", synthThud, 0.3);
  },
  /** Estalo do selo de cera ao quebrar. */
  pop() {
    playSfx("pop", synthPop, 0.25);
  },
  /** Sininho ao abrir a surpresa. */
  chime() {
    playSfx("chime", synthChime, 0.25);
  },
};
