// Ferramenta do dia: confere e zera o que ela guarda no livro (foto e carta) no site publicado.
//
//   npm run registro:status   mostra o que existe hoje e se o site está pronto para o dia
//   npm run registro:reset    apaga a foto e a carta (pede confirmação; use --yes para pular)
//
// Também dá para clicar em ver-registro.bat e resetar-registro.bat, na raiz do projeto.
//
// Lê o arquivo .env.local (fora do git):
//   ADMIN_KEY=<a mesma chave cadastrada no Vercel>
//   SITE_URL=https://nossoalbum.nagatins.com
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

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

const [command = "status", ...flags] = process.argv.slice(2);
const skipConfirm = flags.includes("--yes") || flags.includes("-y");

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });

async function getJson(path) {
  const res = await fetch(`${site}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} respondeu ${res.status}`);
  return res.json();
}

async function status() {
  console.log(`\nSite: ${site}\n`);
  let photo, letter, locked;
  try {
    [photo, letter, locked] = await Promise.all([getJson("/api/registro"), getJson("/api/carta"), getJson("/api/trancada")]);
  } catch (err) {
    console.error("Não consegui falar com o site:", err.message);
    console.error("Confira a internet e o SITE_URL no .env.local. Se o deploy ainda não terminou, espere um pouco.");
    process.exit(1);
  }

  console.log(`Foto:    ${photo ? `EXISTE (tirada em ${fmtDate(photo.takenAt)})` : "vazia"}`);
  console.log(
    `Carta:   ${letter ? `EXISTE (escrita em ${fmtDate(letter.writtenAt)}, ${letter.text.length} caracteres)` : "vazia"}`
  );
  if (!locked.configured) {
    console.log("Trancada: NÃO CONFIGURADA (defina LOCKED_UNLOCK_AT e LOCKED_MESSAGE no Vercel e faça um Redeploy)");
  } else if (locked.locked) {
    const days = Math.ceil((Date.parse(locked.unlockAt) - Date.parse(locked.now)) / 86400000);
    console.log(`Trancada: abre em ${fmtDate(locked.unlockAt)} (faltam ${days} dias)`);
  } else {
    console.log(`Trancada: JÁ ABERTA desde ${fmtDate(locked.unlockAt)}. Confira a data em LOCKED_UNLOCK_AT.`);
  }

  const ready = !photo && !letter && locked.configured && locked.locked;
  console.log(
    ready
      ? "\nTudo pronto para o dia: foto e carta vazias, e a página trancada configurada."
      : "\nAinda NÃO está pronto para o dia (veja os itens acima). Para zerar foto e carta: npm run registro:reset"
  );
}

async function reset() {
  if (!key) {
    console.error("Falta ADMIN_KEY no arquivo .env.local (precisa ser igual à do Vercel, em Settings > Environment Variables).");
    process.exit(1);
  }

  if (!skipConfirm) {
    console.log(`\nIsto vai APAGAR a foto e a carta guardadas em ${site}.`);
    if (/localhost|127\.0\.0\.1/.test(site)) console.log("(é o site local de teste)");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Para continuar, digite SIM e aperte Enter: ')).trim().toLowerCase();
    rl.close();
    if (answer !== "sim") {
      console.log("Cancelado. Nada foi apagado.");
      return;
    }
  }

  let failed = false;
  for (const [label, path] of [
    ["Foto", "/api/registro"],
    ["Carta", "/api/carta"],
  ]) {
    try {
      const res = await fetch(`${site}${path}`, { method: "DELETE", headers: { "x-admin-key": key } });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`${label}: apagada (${body.removed ?? 0} arquivo(s)).`);
      } else if (res.status === 401) {
        console.error(`${label}: a ADMIN_KEY do .env.local não é igual à do Vercel (ou o Redeploy ainda não foi feito).`);
        failed = true;
      } else {
        console.error(`${label}: falhou (${res.status}).`, body);
        failed = true;
      }
    } catch (err) {
      console.error(`${label}: não consegui falar com o site (${err.message}).`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("\nConferindo o resultado:");
  await status();
}

if (command === "status") await status();
else if (command === "reset") await reset();
else {
  console.error(`Comando desconhecido: "${command}". Use "status" ou "reset".`);
  process.exit(1);
}
