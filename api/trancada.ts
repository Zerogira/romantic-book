/*
 * API da "página trancada": uma mensagem que só é entregue a partir de uma data.
 *
 *   GET /api/trancada
 *     -> { configured: false }                                       (sem data definida)
 *     -> { configured: true, locked: true,  unlockAt, now }          (ainda trancada)
 *     -> { configured: true, locked: false, unlockAt, now, message } (liberada)
 *
 * A data e a mensagem ficam em variáveis de ambiente do Vercel, FORA do código:
 *   LOCKED_UNLOCK_AT  data/hora de abertura, ex.: 2027-11-08T00:00:00-03:00
 *   LOCKED_MESSAGE    texto da mensagem
 * Assim a mensagem só chega ao navegador depois da data (quem abrir o código do site antes
 * não encontra o texto) e o relógio usado é o do servidor, não o do celular.
 */

type Req = { method?: string };

type Res = {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const unlockAtMs = Date.parse(process.env.LOCKED_UNLOCK_AT ?? "");
  if (Number.isNaN(unlockAtMs)) return res.status(200).json({ configured: false });

  const nowMs = Date.now();
  const base = {
    configured: true,
    unlockAt: new Date(unlockAtMs).toISOString(),
    now: new Date(nowMs).toISOString(),
  };

  if (nowMs < unlockAtMs) return res.status(200).json({ ...base, locked: true });
  return res.status(200).json({ ...base, locked: false, message: process.env.LOCKED_MESSAGE ?? "" });
}
