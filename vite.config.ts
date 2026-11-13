import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const ROOT = process.cwd();
const STICKERS_DIR = path.resolve(ROOT, "public/images/figurinhas");
const STICKERS_JSON = path.resolve(ROOT, "src/data/stickers.json");
const STICKERS_MOBILE_JSON = path.resolve(ROOT, "src/data/stickers.mobile.json");
const PAGES_JSON = path.resolve(ROOT, "src/data/pages.json");
// Pastas de fotos usadas pelas páginas do álbum
const PHOTO_DIRS = ["images/memories", "images/moments"];
const UPLOAD_DIR = path.resolve(ROOT, "public/images/memories");
const IMAGE_EXT = /\.(gif|png|webp|jpe?g|svg)$/i;
const PHOTO_EXT = /\.(png|webp|jpe?g|gif)$/i;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const PAGE_LAYOUTS = [
  "intro",
  "photo",
  "destaque",
  "collage",
  "trio",
  "quad",
  "trioInvertido",
  "trioVertical",
  "zigzag",
  "trioHorizontal",
  "timeline",
  "details",
  "letter",
  "closure",
  "registro",
  "resposta",
  "trancada",
];
// Pasta local que imita o Vercel Blob no desenvolvimento (fora do git)
const DEV_REGISTRO_DIR = path.resolve(ROOT, ".dev-registro");

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit = 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Arquivo grande demais"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isValidSticker(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.type === "string" &&
    typeof s.label === "string" &&
    typeof s.x === "number" &&
    typeof s.y === "number" &&
    typeof s.rotation === "number"
  );
}

function isValidPage(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const p = item as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.chapter === "string" &&
    typeof p.title === "string" &&
    typeof p.text === "string" &&
    typeof p.layout === "string" &&
    PAGE_LAYOUTS.includes(p.layout) &&
    (p.stickers === undefined || (Array.isArray(p.stickers) && p.stickers.every(isValidSticker))) &&
    (p.outerStickers === undefined || (Array.isArray(p.outerStickers) && p.outerStickers.every(isValidSticker)))
  );
}

function listPhotos(): string[] {
  return PHOTO_DIRS.flatMap((dir) => {
    try {
      return fs
        .readdirSync(path.resolve(ROOT, "public", dir))
        .filter((f) => PHOTO_EXT.test(f))
        .sort()
        .map((f) => `/${dir}/${f}`);
    } catch {
      return [];
    }
  });
}

/** Deixa só letras, números, ponto, traço e underline; força extensão de imagem. */
function safeFileName(raw: string): string | null {
  const base = path.basename(raw).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "");
  if (!cleaned || !PHOTO_EXT.test(cleaned)) return null;
  return cleaned;
}

/**
 * Apenas em desenvolvimento (npm run dev): endpoints que leem e gravam os dados
 * do álbum no projeto. Não existem em produção.
 */
function albumDevApi(env: Record<string, string>): Plugin {
  return {
    name: "album-dev-api",
    apply: "serve",
    configureServer(server) {
      // ---- Figurinhas ----
      server.middlewares.use("/__stickers/assets", (req, res) => {
        if (req.method !== "GET") return sendJson(res, 405, { error: "Método não permitido" });
        try {
          const files = fs
            .readdirSync(STICKERS_DIR)
            .filter((f) => IMAGE_EXT.test(f))
            .sort()
            .map((f) => `/images/figurinhas/${f}`);
          sendJson(res, 200, files);
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      server.middlewares.use("/__stickers/save", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Método não permitido" });
        try {
          const parsed = JSON.parse((await readBody(req)).toString("utf8"));
          if (!Array.isArray(parsed) || !parsed.every(isValidSticker)) {
            return sendJson(res, 400, { error: "Lista de figurinhas inválida" });
          }
          const target = new URL(req.url ?? "", "http://localhost").searchParams.get("target");
          const file = target === "mobile" ? STICKERS_MOBILE_JSON : STICKERS_JSON;
          fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n", "utf8");
          sendJson(res, 200, { ok: true, count: parsed.length });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      // ---- Registro do dia (imita /api/registro do Vercel, guardando em .dev-registro) ----
      const devPhoto = path.join(DEV_REGISTRO_DIR, "foto.jpg");
      const devMeta = path.join(DEV_REGISTRO_DIR, "meta.json");
      const readDevRegistro = () => {
        try {
          if (!fs.existsSync(devPhoto) || !fs.existsSync(devMeta)) return null;
          const meta = JSON.parse(fs.readFileSync(devMeta, "utf8")) as { takenAt: string };
          return { url: `/__dev-registro/foto.jpg?v=${Date.parse(meta.takenAt)}`, takenAt: meta.takenAt };
        } catch {
          return null;
        }
      };

      server.middlewares.use("/__dev-registro", (req, res) => {
        try {
          res.setHeader("Content-Type", "image/jpeg");
          res.setHeader("Cache-Control", "no-store");
          res.end(fs.readFileSync(devPhoto));
        } catch {
          res.statusCode = 404;
          res.end();
        }
      });

      server.middlewares.use("/api/registro", async (req, res) => {
        try {
          if (req.method === "GET") {
            const wantsImage = new URL(req.url ?? "", "http://localhost").searchParams.has("img");
            if (wantsImage) {
              if (!fs.existsSync(devPhoto)) return sendJson(res, 404, { error: "not_found" });
              res.setHeader("Content-Type", "image/jpeg");
              return res.end(fs.readFileSync(devPhoto));
            }
            return sendJson(res, 200, readDevRegistro());
          }
          if (req.method === "DELETE") {
            fs.rmSync(devPhoto, { force: true });
            fs.rmSync(devMeta, { force: true });
            return sendJson(res, 200, { removed: 1 });
          }
          if (req.method === "POST") {
            const body = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString("utf8")) as { image?: string };
            const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.image ?? "");
            const buffer = match ? Buffer.from(match[1], "base64") : null;
            if (!buffer || buffer.length === 0 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
              return sendJson(res, 400, { error: "invalid_image" });
            }
            const existing = readDevRegistro();
            if (existing) return sendJson(res, 409, { error: "already_exists", ...existing });
            fs.mkdirSync(DEV_REGISTRO_DIR, { recursive: true });
            const takenAt = new Date().toISOString();
            fs.writeFileSync(devPhoto, buffer);
            fs.writeFileSync(devMeta, JSON.stringify({ takenAt }));
            return sendJson(res, 200, readDevRegistro());
          }
          sendJson(res, 405, { error: "method_not_allowed" });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      // ---- Carta de resposta (imita /api/carta) ----
      const devCarta = path.join(DEV_REGISTRO_DIR, "carta.json");
      const readDevCarta = () => {
        try {
          if (!fs.existsSync(devCarta)) return null;
          return JSON.parse(fs.readFileSync(devCarta, "utf8")) as { text: string; writtenAt: string };
        } catch {
          return null;
        }
      };

      server.middlewares.use("/api/carta", async (req, res) => {
        try {
          if (req.method === "GET") return sendJson(res, 200, readDevCarta());
          if (req.method === "DELETE") {
            fs.rmSync(devCarta, { force: true });
            return sendJson(res, 200, { removed: 1 });
          }
          if (req.method === "POST") {
            const body = JSON.parse((await readBody(req)).toString("utf8")) as { text?: unknown };
            const text = typeof body.text === "string" ? body.text.trim() : "";
            if (text.length === 0 || text.length > 1200) return sendJson(res, 400, { error: "invalid_text" });
            const existing = readDevCarta();
            if (existing) return sendJson(res, 409, { error: "already_exists", ...existing });
            fs.mkdirSync(DEV_REGISTRO_DIR, { recursive: true });
            const letter = { text, writtenAt: new Date().toISOString() };
            fs.writeFileSync(devCarta, JSON.stringify(letter));
            return sendJson(res, 200, letter);
          }
          sendJson(res, 405, { error: "method_not_allowed" });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      // ---- Assinaturas da cartinha (imita /api/assinatura) ----
      const devAssinatura = path.join(DEV_REGISTRO_DIR, "assinatura.json");
      type DevSignature = { image: string; signedAt: string };
      const readDevAssinaturas = (): Record<"abb" | "obb", DevSignature | null> => {
        try {
          const data = JSON.parse(fs.readFileSync(devAssinatura, "utf8")) as Partial<Record<"abb" | "obb", DevSignature>>;
          return { abb: data.abb ?? null, obb: data.obb ?? null };
        } catch {
          return { abb: null, obb: null };
        }
      };

      server.middlewares.use("/api/assinatura", async (req, res) => {
        try {
          if (req.method === "GET") return sendJson(res, 200, readDevAssinaturas());
          if (req.method === "DELETE") {
            fs.rmSync(devAssinatura, { force: true });
            return sendJson(res, 200, { removed: 1 });
          }
          if (req.method === "POST") {
            const body = JSON.parse((await readBody(req, 1024 * 1024)).toString("utf8")) as { who?: unknown; image?: unknown };
            const who = body.who === "abb" || body.who === "obb" ? body.who : null;
            const image = typeof body.image === "string" ? body.image : "";
            if (!who || image.length > 250_000 || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(image)) {
              return sendJson(res, 400, { error: "invalid_signature" });
            }
            const all = readDevAssinaturas();
            const existing = all[who];
            if (existing) return sendJson(res, 409, { error: "already_exists", who, ...existing });
            fs.mkdirSync(DEV_REGISTRO_DIR, { recursive: true });
            const signature = { image, signedAt: new Date().toISOString() };
            fs.writeFileSync(devAssinatura, JSON.stringify({ ...all, [who]: signature }));
            return sendJson(res, 200, { who, ...signature });
          }
          sendJson(res, 405, { error: "method_not_allowed" });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      // ---- Página trancada (imita /api/trancada; usa LOCKED_* do .env.local, se houver) ----
      server.middlewares.use("/api/trancada", (req, res) => {
        if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });
        const defaultUnlock = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const unlockAtMs = Date.parse(env.LOCKED_UNLOCK_AT || defaultUnlock);
        const nowMs = Date.now();
        const base = { configured: true, unlockAt: new Date(unlockAtMs).toISOString(), now: new Date(nowMs).toISOString() };
        if (nowMs < unlockAtMs) return sendJson(res, 200, { ...base, locked: true });
        sendJson(res, 200, { ...base, locked: false, message: env.LOCKED_MESSAGE || "Mensagem de teste. Defina LOCKED_MESSAGE no .env.local." });
      });

      // ---- Reset do teste: o reset.bat grava um token em .dev-registro; quando ele muda, o navegador
      //      apaga as cópias locais (foto, carta, assinaturas, envelope). Ver src/main.tsx ----
      server.middlewares.use("/__dev-reset", (req, res) => {
        let token = "0";
        try {
          token = fs.readFileSync(path.join(DEV_REGISTRO_DIR, "reset-token"), "utf8").trim() || "0";
        } catch {}
        res.setHeader("Cache-Control", "no-store");
        sendJson(res, 200, { token });
      });

      // ---- Páginas do álbum ----
      server.middlewares.use("/__pages/photos", (req, res) => {
        if (req.method !== "GET") return sendJson(res, 405, { error: "Método não permitido" });
        sendJson(res, 200, listPhotos());
      });

      server.middlewares.use("/__pages/upload", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Método não permitido" });
        try {
          const url = new URL(req.url ?? "", "http://localhost");
          const name = safeFileName(url.searchParams.get("name") ?? "");
          if (!name) return sendJson(res, 400, { error: "Nome de arquivo inválido (use jpg, png, webp ou gif)" });
          const data = await readBody(req, MAX_UPLOAD_BYTES);
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          // Não sobrescreve foto existente: acrescenta um sufixo
          let target = path.join(UPLOAD_DIR, name);
          const ext = path.extname(name);
          const stem = path.basename(name, ext);
          let counter = 1;
          while (fs.existsSync(target)) {
            target = path.join(UPLOAD_DIR, `${stem}-${counter++}${ext}`);
          }
          fs.writeFileSync(target, data);
          sendJson(res, 200, { ok: true, src: `/images/memories/${path.basename(target)}` });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      server.middlewares.use("/__pages/save", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Método não permitido" });
        try {
          const parsed = JSON.parse((await readBody(req)).toString("utf8"));
          if (!Array.isArray(parsed) || !parsed.every(isValidPage)) {
            return sendJson(res, 400, { error: "Lista de páginas inválida" });
          }
          fs.writeFileSync(PAGES_JSON, JSON.stringify(parsed, null, 2) + "\n", "utf8");
          sendJson(res, 200, { ok: true, count: parsed.length });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // loadEnv lê o .env.local (usado só pelos servidores de teste do modo de desenvolvimento)
  plugins: [react(), albumDevApi(loadEnv(mode, ROOT, ""))],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-pageflip", "lucide-react"],
  },
}));
