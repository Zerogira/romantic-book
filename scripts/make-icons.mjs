// Gera os ícones do app (coração sobre fundo rosa) em public/icons, sem dependências.
// Uso: node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// ---- Codificador PNG mínimo ----
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bits por canal
  header[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // sem filtro
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Desenho ----
const lerp = (a, b, t) => a + (b - a) * t;

// Dentro do coração? (curva clássica; y para cima)
function inHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const unit = size * 0.19; // o coração ocupa ~46% do ícone (cabe na zona segura "maskable")
  const cx = size / 2;
  const cy = size / 2 + size * 0.015;
  const samples = 4;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Fundo: degradê diagonal rosa
      const t = (px + py) / (2 * size);
      const bg = [lerp(252, 240, t), lerp(208, 150, t), lerp(219, 175, t)];

      // Cobertura do coração por supersampling (borda suave)
      let covered = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples - cx) / unit;
          const y = -(py + (sy + 0.5) / samples - cy) / unit;
          if (inHeart(x, y)) covered++;
        }
      }
      const a = covered / (samples * samples);
      const heart = [255, 253, 249];

      const i = (py * size + px) * 4;
      rgba[i] = Math.round(lerp(bg[0], heart[0], a));
      rgba[i + 1] = Math.round(lerp(bg[1], heart[1], a));
      rgba[i + 2] = Math.round(lerp(bg[2], heart[2], a));
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync("public/icons", { recursive: true });
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(`public/icons/${name}`, drawIcon(size));
  console.log(`public/icons/${name} (${size}x${size})`);
}
