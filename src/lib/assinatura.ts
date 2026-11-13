// Assinaturas da cartinha da surpresa: cada um assina com o dedo (ver api/assinatura.ts).

export type SignerId = "abb" | "obb";

/** Quem assina, na ordem em que aparece no rodapé da cartinha. */
export const SIGNERS: { id: SignerId; label: string }[] = [
  { id: "abb", label: "Abb" },
  { id: "obb", label: "Obb" },
];

export type Signature = {
  /** PNG em data URL, com fundo transparente. */
  image: string;
  /** Data/hora da assinatura, em ISO. */
  signedAt: string;
  /** true quando já está guardada no servidor. */
  synced: boolean;
};

export type Signatures = Partial<Record<SignerId, Signature>>;

/** true quando os dois já assinaram (a promessa está "selada"). */
export function isSealed(signatures: Signatures): boolean {
  return SIGNERS.every(({ id }) => Boolean(signatures[id]));
}

/** Momento em que a promessa foi selada: a hora da última assinatura (ISO), ou null se falta alguém. */
export function sealedAtOf(signatures: Signatures): string | null {
  if (!isSealed(signatures)) return null;
  const times = SIGNERS.map(({ id }) => Date.parse(signatures[id]!.signedAt)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

/** Ex.: "13 de novembro de 2026 às 15:42" (horário de Brasília). */
export function formatSealedAt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });
}

type ServerSignature = { image: string; signedAt: string };

const LOCAL_KEY = "romantic_book_assinaturas_v1";
const API_URL = "/api/assinatura";

// ---- Cópia local (a assinatura aparece na hora e nunca se perde) ----

export function readLocalAssinaturas(): Signatures {
  const result: Signatures = {};
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return result;
    const data = JSON.parse(raw) as Partial<Record<SignerId, Partial<Signature>>>;
    for (const { id } of SIGNERS) {
      const s = data[id];
      if (s && typeof s.image === "string" && typeof s.signedAt === "string") {
        result[id] = { image: s.image, signedAt: s.signedAt, synced: s.synced === true };
      }
    }
  } catch {}
  return result;
}

export function writeLocalAssinaturas(signatures: Signatures) {
  try {
    if (Object.keys(signatures).length > 0) localStorage.setItem(LOCAL_KEY, JSON.stringify(signatures));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

// ---- Servidor ----

function parseServer(value: unknown): ServerSignature | null {
  const s = value as Partial<ServerSignature> | null;
  return s && typeof s.image === "string" && typeof s.signedAt === "string" ? { image: s.image, signedAt: s.signedAt } : null;
}

/** Assinaturas salvas no servidor. Lança erro se o servidor não responder. */
export async function fetchAssinaturas(): Promise<Partial<Record<SignerId, ServerSignature>>> {
  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = (await res.json()) as Record<string, unknown> | null;
  const result: Partial<Record<SignerId, ServerSignature>> = {};
  for (const { id } of SIGNERS) {
    const s = parseServer(data?.[id]);
    if (s) result[id] = s;
  }
  return result;
}

export type AssinaturaUploadResult =
  | { kind: "saved"; signature: ServerSignature }
  | { kind: "exists"; signature: ServerSignature } // essa pessoa já tinha assinado no servidor
  | { kind: "failed" };

export async function uploadAssinatura(who: SignerId, image: string): Promise<AssinaturaUploadResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ who, image }),
    });
    if (res.ok || res.status === 409) {
      const signature = parseServer(await res.json());
      if (signature) return { kind: res.ok ? "saved" : "exists", signature };
    }
  } catch {}
  return { kind: "failed" };
}
