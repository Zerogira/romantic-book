import { defineConfig, type Plugin } from "vite";
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
const PAGE_LAYOUTS = ["intro", "photo", "collage", "timeline", "details", "letter", "closure", "registro"];
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
    PAGE_LAYOUTS.includes(p.layout)
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
function albumDevApi(): Plugin {
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
          if (req.method === "GET") return sendJson(res, 200, readDevRegistro());
          if (req.method === "DELETE") {
            fs.rmSync(DEV_REGISTRO_DIR, { recursive: true, force: true });
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

export default defineConfig({
  plugins: [react(), albumDevApi()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-pageflip", "lucide-react"],
  },
});
