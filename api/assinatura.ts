/*
 * API das assinaturas da cartinha da surpresa: cada um assina com o dedo (Abb e Obb).
 *
 *   GET    /api/assinatura  -> { abb, obb }, cada um { image, signedAt } ou null
 *   POST   /api/assinatura  -> salva uma assinatura ({ who: "abb" | "obb", image: "data:image/png;base64,..." })
 *   DELETE /api/assinatura  -> apaga as assinaturas (exige o cabeçalho x-admin-key)
 *
 * Guarda no Vercel Blob (mesma variável BLOB_READ_WRITE_TOKEN da foto e da carta; não precisa
 * de variável nova). A data vem do servidor. Cada pessoa só assina uma vez; para refazer é
 * preciso apagar antes (DELETE, ou npm run registro:reset).
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

const PREFIX = "assinatura/";
const WHO = ["abb", "obb"] as const;
type Who = (typeof WHO)[number];
type Signature = { image: string; signedAt: string };

const PNG_PREFIX = "data:image/png;base64,iVBORw0KGgo";
const DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 250_000;

async function readBlobText(url: string): Promise<string> {
  // Store público (fetch direto) ou privado (leitura autenticada)
  try {
    const response = await fetch(url);
    if (response.ok) return await response.text();
  } catch {}
  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) throw new Error("falha ao ler a assinatura");
  return await new Response(result.stream).text();
}

async function currentSignature(who: Who): Promise<Signature | null> {
  const { blobs } = await list({ prefix: `${PREFIX}${who}-` });
  if (blobs.length === 0) return null;
  const latest = [...blobs].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  const data = JSON.parse(await readBlobText(latest.url)) as { image?: unknown };
  if (typeof data.image !== "string") return null;
  return { image: data.image, signedAt: latest.uploadedAt.toISOString() };
}

function isAdmin(req: Req): boolean {
  const expected = process.env.ADMIN_KEY;
  const sent = req.headers["x-admin-key"];
  if (!expected || typeof sent !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sent);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(body: unknown): { who: Who; image: string } | null {
  let data: unknown = body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const { who, image } = (data ?? {}) as { who?: unknown; image?: unknown };
  if (typeof who !== "string" || !(WHO as readonly string[]).includes(who)) return null;
  if (typeof image !== "string" || image.length > MAX_IMAGE_CHARS) return null;
  if (!image.startsWith(PNG_PREFIX) || !DATA_URL.test(image)) return null;
  return { who: who as Who, image };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const [abb, obb] = await Promise.all(WHO.map((who) => currentSignature(who)));
      return res.status(200).json({ abb, obb });
    }

    if (req.method === "POST") {
      const input = readBody(req.body);
      if (!input) return res.status(400).json({ error: "invalid_signature" });

      const existing = await currentSignature(input.who);
      if (existing) {
        if (!isAdmin(req)) return res.status(409).json({ error: "already_exists", who: input.who, ...existing });
        const { blobs } = await list({ prefix: `${PREFIX}${input.who}-` });
        await del(blobs.map((b) => b.url));
      }

      const path = `${PREFIX}${input.who}-${Date.now()}.json`;
      const body = JSON.stringify({ image: input.image });
      const options = { contentType: "application/json", addRandomSuffix: true };
      try {
        await put(path, body, { ...options, access: "public" });
      } catch (err) {
        console.warn("put público falhou, tentando privado:", err);
        await put(path, body, { ...options, access: "private" });
      }
      return res.status(200).json({ who: input.who, image: input.image, signedAt: new Date().toISOString() });
    }

    if (req.method === "DELETE") {
      if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
      const { blobs } = await list({ prefix: PREFIX });
      if (blobs.length > 0) await del(blobs.map((b) => b.url));
      return res.status(200).json({ removed: blobs.length });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("api/assinatura falhou:", err);
    return res.status(500).json({ error: "internal" });
  }
}
