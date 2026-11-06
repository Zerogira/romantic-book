// Carta de resposta: o texto que ela escreve ao final do livro (ver api/carta.ts).

export const CARTA_MAX_CHARS = 1200;

export type CartaLetter = {
  text: string;
  /** Data/hora em que foi escrita, em ISO. */
  writtenAt: string;
  /** true quando a carta já está guardada no servidor. */
  synced: boolean;
};

const LOCAL_KEY = "romantic_book_carta_v1";
const DRAFT_KEY = "romantic_book_carta_draft_v1";
const API_URL = "/api/carta";

// ---- Cópia local (a carta aparece na hora e nunca se perde) ----

export function readLocalCarta(): CartaLetter | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<CartaLetter>;
    if (typeof data.text === "string" && typeof data.writtenAt === "string") {
      return { text: data.text, writtenAt: data.writtenAt, synced: data.synced === true };
    }
  } catch {}
  return null;
}

export function writeLocalCarta(letter: CartaLetter | null) {
  try {
    if (letter) localStorage.setItem(LOCAL_KEY, JSON.stringify(letter));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

// ---- Rascunho (enquanto ela ainda está escrevendo) ----

export function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(text: string) {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ---- Servidor ----

type ServerLetter = { text: string; writtenAt: string };

/** Carta salva no servidor, ou null se ainda não existe. Lança erro se o servidor não responder. */
export async function fetchCarta(): Promise<ServerLetter | null> {
  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  if (data && typeof data.text === "string" && typeof data.writtenAt === "string") return data;
  return null;
}

export type CartaUploadResult =
  | { kind: "saved"; letter: ServerLetter }
  | { kind: "exists"; letter: ServerLetter } // já havia uma carta no servidor
  | { kind: "failed" };

export async function uploadCarta(text: string): Promise<CartaUploadResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) return { kind: "saved", letter: await res.json() };
    if (res.status === 409) {
      const data = await res.json();
      return { kind: "exists", letter: { text: data.text, writtenAt: data.writtenAt } };
    }
  } catch {}
  return { kind: "failed" };
}
