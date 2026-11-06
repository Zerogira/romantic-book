// Registro do dia: a foto tirada ao final do livro (ver api/registro.ts).

export type RegistroPhoto = {
  /** Endereço da foto (URL pública) ou, enquanto não foi enviada, a própria imagem (data URL). */
  src: string;
  /** Data/hora da foto, em ISO. */
  takenAt: string;
  /** true quando a foto já está guardada no servidor. */
  synced: boolean;
};

const LOCAL_KEY = "romantic_book_registro_v1";
const API_URL = "/api/registro";

// ---- Cópia local (para a foto aparecer na hora e nunca se perder) ----

export function readLocalRegistro(): RegistroPhoto | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<RegistroPhoto>;
    if (typeof data.src === "string" && typeof data.takenAt === "string") {
      return { src: data.src, takenAt: data.takenAt, synced: data.synced === true };
    }
  } catch {}
  return null;
}

export function writeLocalRegistro(photo: RegistroPhoto | null) {
  try {
    if (photo) localStorage.setItem(LOCAL_KEY, JSON.stringify(photo));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

// ---- Servidor ----

type ServerPhoto = { url: string; takenAt: string };

/** Foto salva no servidor, ou null se ainda não existe. Lança erro se o servidor não responder. */
export async function fetchRegistro(): Promise<ServerPhoto | null> {
  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  if (data && typeof data.url === "string" && typeof data.takenAt === "string") return data;
  return null;
}

export type UploadResult =
  | { kind: "saved"; photo: ServerPhoto }
  | { kind: "exists"; photo: ServerPhoto } // já havia uma foto no servidor
  | { kind: "failed" };

export async function uploadRegistro(imageDataUrl: string): Promise<UploadResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
    });
    if (res.ok) {
      const photo = await res.json();
      return { kind: "saved", photo };
    }
    if (res.status === 409) {
      const photo = await res.json();
      return { kind: "exists", photo: { url: photo.url, takenAt: photo.takenAt } };
    }
  } catch {}
  return { kind: "failed" };
}

// ---- Imagem ----

const OUTPUT_SIZE = 1000; // lado do quadrado final, em pixels
const JPEG_QUALITY = 0.85;

/** Recorta o centro em quadrado e devolve um JPEG (data URL), já reduzido para envio. */
export function squareJpeg(source: CanvasImageSource, width: number, height: number, mirror: boolean): string {
  const side = Math.min(width, height);
  const out = Math.min(OUTPUT_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  if (mirror) {
    ctx.translate(out, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, out, out);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/** Carrega um arquivo de imagem (da câmera nativa do celular) respeitando a orientação. */
export async function fileToSquareJpeg(file: File): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const url = squareJpeg(bitmap, bitmap.width, bitmap.height, false);
      bitmap.close();
      return url;
    } catch {
      // cai para o método com <img>
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    return squareJpeg(img, img.naturalWidth, img.naturalHeight, false);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** "6 de novembro de 2026", no fuso do Brasil. */
export function formatRegistroDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
