// Apaga a foto e a carta do "registro do dia" no site publicado (para deixar tudo zerado antes do dia).
//
// Uso:   npm run registro:reset
// Requer, em .env.local (que não vai para o git):
//   ADMIN_KEY=<a mesma chave cadastrada no Vercel>
//   SITE_URL=https://nossoalbum.nagatins.com     (opcional)
import { readFileSync, existsSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...loadEnvFile(".env.local"), ...process.env };
const site = (env.SITE_URL || "https://nossoalbum.nagatins.com").replace(/\/$/, "");
const key = env.ADMIN_KEY;

if (!key) {
  console.error("Falta ADMIN_KEY. Coloque-a em .env.local (e no Vercel, em Settings > Environment Variables).");
  process.exit(1);
}

let failed = false;
for (const [label, path] of [
  ["foto", "/api/registro"],
  ["carta", "/api/carta"],
]) {
  const res = await fetch(`${site}${path}`, { method: "DELETE", headers: { "x-admin-key": key } });
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`${label}: apagada em ${site} (${body.removed ?? 0} arquivo(s)).`);
  } else {
    console.error(`${label}: falhou (${res.status}):`, body);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
