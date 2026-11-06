/*
 * API do "registro do dia": a foto tirada ao final do livro.
 *
 *   GET    /api/registro  -> { url, takenAt } da foto salva, ou null
 *   POST   /api/registro  -> salva a foto ({ image: "data:image/jpeg;base64,..." })
 *   DELETE /api/registro  -> apaga a foto (exige o cabeçalho x-admin-key)
 *
 * A foto fica no Vercel Blob (variável BLOB_READ_WRITE_TOKEN, criada ao conectar
 * um Blob store ao projeto). A data vem do servidor, não do relógio do celular.
 * Só o primeiro envio é aceito; para refazer é preciso apagar antes (DELETE).
 */
import { put, list, del } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type Res = {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

const PREFIX = "registro/";
const MAX_BYTES = 1_500_000; // o app envia ~200 KB; isto só barra abusos
const DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;

async function currentPhoto(): Promise<{ url: string; takenAt: string } | null> {
  const { blobs } = await list({ prefix: PREFIX });
  if (blobs.length === 0) return null;
  const latest = [...blobs].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  return { url: latest.url, takenAt: latest.uploadedAt.toISOString() };
}

function isAdmin(req: Req): boolean {
  const expected = process.env.ADMIN_KEY;
  const sent = req.headers["x-admin-key"];
  if (!expected || typeof sent !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sent);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readImage(body: unknown): Buffer | null {
  let data: unknown = body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const image = (data as { image?: unknown } | null)?.image;
  if (typeof image !== "string") return null;
  const match = DATA_URL.exec(image);
  if (!match) return null;
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;
  // Confere a assinatura de um JPEG (FF D8 FF)
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return null;
  return buffer;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      return res.status(200).json(await currentPhoto());
    }

    if (req.method === "POST") {
      const image = readImage(req.body);
      if (!image) return res.status(400).json({ error: "invalid_image" });

      const existing = await currentPhoto();
      if (existing) {
        if (!isAdmin(req)) return res.status(409).json({ error: "already_exists", ...existing });
        const { blobs } = await list({ prefix: PREFIX });
        await del(blobs.map((b) => b.url));
      }

      const blob = await put(`${PREFIX}${Date.now()}.jpg`, image, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      });
      return res.status(200).json({ url: blob.url, takenAt: new Date().toISOString() });
    }

    if (req.method === "DELETE") {
      if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
      const { blobs } = await list({ prefix: PREFIX });
      if (blobs.length > 0) await del(blobs.map((b) => b.url));
      return res.status(200).json({ removed: blobs.length });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("api/registro falhou:", err);
    return res.status(500).json({ error: "internal" });
  }
}
