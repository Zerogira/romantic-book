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
