// Página trancada: mensagem entregue pelo servidor só a partir de uma data (ver api/trancada.ts).

export type TrancadaStatus =
  | { configured: false }
  | { configured: true; locked: true; unlockAt: string; now: string }
  | { configured: true; locked: false; unlockAt: string; now: string; message: string };

const CACHE_KEY = "romantic_book_trancada_v1";

export async function fetchTrancada(): Promise<TrancadaStatus> {
  const res = await fetch("/api/trancada", { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = (await res.json()) as TrancadaStatus;
  if (data.configured && !data.locked) cacheUnlocked(data.message);
  return data;
}

/** Depois de liberada, guarda a mensagem no aparelho para poder relê-la sem internet. */
function cacheUnlocked(message: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ message }));
  } catch {}
}

export function readCachedMessage(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { message?: unknown };
    return typeof data.message === "string" ? data.message : null;
  } catch {
    return null;
  }
}

/** "8 de novembro de 2027", no fuso do Brasil. */
export function formatUnlockDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}
