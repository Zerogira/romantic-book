/*
 * API da "carta de resposta": o texto que ela escreve ao final do livro.
 *
 *   GET    /api/carta  -> { text, writtenAt } da carta salva, ou null
 *   POST   /api/carta  -> salva a carta ({ text })
 *   DELETE /api/carta  -> apaga a carta (exige o cabeçalho x-admin-key)
 *
 * Guarda no Vercel Blob (mesma variável BLOB_READ_WRITE_TOKEN da foto). A data vem do
 * servidor. Só a primeira carta é aceita; para refazer é preciso apagar antes (DELETE).
 */
import { put, list, del, get } from "@vercel/blob";
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

const PREFIX = "carta/";
const MAX_CHARS = 1200;

async function currentLetter(): Promise<{ text: string; writtenAt: string } | null> {
  const { blobs } = await list({ prefix: PREFIX });
  if (blobs.length === 0) return null;
  const latest = [...blobs].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  // Store público (fetch direto) ou privado (leitura autenticada)
  let raw: string | null = null;
  try {
    const response = await fetch(latest.url);
    if (response.ok) raw = await response.text();
  } catch {}
  if (raw === null) {
    const result = await get(latest.url, { access: "private" });
    if (!result || result.statusCode !== 200) throw new Error("falha ao ler a carta");
    raw = await new Response(result.stream).text();
  }
  const data = JSON.parse(raw) as { text?: unknown };
  if (typeof data.text !== "string") return null;
  return { text: data.text, writtenAt: latest.uploadedAt.toISOString() };
}

function isAdmin(req: Req): boolean {
  const expected = process.env.ADMIN_KEY;
  const sent = req.headers["x-admin-key"];
  if (!expected || typeof sent !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sent);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readText(body: unknown): string | null {
  let data: unknown = body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const text = (data as { text?: unknown } | null)?.text;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CHARS) return null;
  return trimmed;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      return res.status(200).json(await currentLetter());
    }

    if (req.method === "POST") {
      const text = readText(req.body);
      if (!text) return res.status(400).json({ error: "invalid_text" });

      const existing = await currentLetter();
      if (existing) {
        if (!isAdmin(req)) return res.status(409).json({ error: "already_exists", ...existing });
        const { blobs } = await list({ prefix: PREFIX });
        await del(blobs.map((b) => b.url));
      }

      const path = `${PREFIX}${Date.now()}.json`;
      const options = { contentType: "application/json", addRandomSuffix: true };
      try {
        await put(path, JSON.stringify({ text }), { ...options, access: "public" });
      } catch (err) {
        console.warn("put público falhou, tentando privado:", err);
        await put(path, JSON.stringify({ text }), { ...options, access: "private" });
      }
      return res.status(200).json({ text, writtenAt: new Date().toISOString() });
    }

    if (req.method === "DELETE") {
      if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
      const { blobs } = await list({ prefix: PREFIX });
      if (blobs.length > 0) await del(blobs.map((b) => b.url));
      return res.status(200).json({ removed: blobs.length });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("api/carta falhou:", err);
    return res.status(500).json({ error: "internal" });
  }
}
