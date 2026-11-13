import { useCallback, useEffect, useRef, useState } from "react";
import {
  SIGNERS,
  fetchAssinaturas,
  readLocalAssinaturas,
  uploadAssinatura,
  writeLocalAssinaturas,
  type Signature,
  type SignerId,
  type Signatures,
} from "../../lib/assinatura";

/**
 * Assinaturas da cartinha: aparecem na hora, ficam guardadas no aparelho e são enviadas ao
 * servidor. Se o envio falhar (sem internet), tenta de novo quando voltar a conexão ou na
 * próxima visita. Cada pessoa assina uma vez.
 */
export function useAssinaturas() {
  const [signatures, setSignatures] = useState<Signatures>(() => readLocalAssinaturas());
  const ref = useRef(signatures);
  const uploading = useRef(new Set<SignerId>());

  const set = useCallback((who: SignerId, signature: Signature | null) => {
    const next = { ...ref.current };
    if (signature) next[who] = signature;
    else delete next[who];
    ref.current = next;
    setSignatures(next);
    writeLocalAssinaturas(next);
  }, []);

  /** Envia uma assinatura pendente. Se o servidor já tinha uma dessa pessoa, adota a do servidor. */
  const send = useCallback(
    async (who: SignerId) => {
      const local = ref.current[who];
      if (!local || local.synced || uploading.current.has(who)) return;
      uploading.current.add(who);
      try {
        const result = await uploadAssinatura(who, local.image);
        if (result.kind === "failed") return;
        set(who, { image: result.signature.image, signedAt: result.signature.signedAt, synced: true });
      } finally {
        uploading.current.delete(who);
      }
    },
    [set]
  );

  // Ao abrir: confere o que existe no servidor
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const server = await fetchAssinaturas();
        if (cancelled) return;
        for (const { id } of SIGNERS) {
          const remote = server[id];
          const local = ref.current[id];
          if (remote) set(id, { ...remote, synced: true });
          else if (local?.synced) set(id, null); // o servidor foi zerado (reset): esquece a cópia local
          else if (local) send(id); // ficou pendente em outra visita: tenta enviar de novo
        }
      } catch {
        // sem conexão (ou sem API): mantém o que existe no aparelho
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [set, send]);

  // Quando a internet voltar, reenvia as pendentes
  useEffect(() => {
    const onOnline = () => SIGNERS.forEach(({ id }) => send(id));
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [send]);

  const sign = useCallback(
    async (who: SignerId, image: string) => {
      if (ref.current[who]) return; // cada pessoa assina uma vez
      set(who, { image, signedAt: new Date().toISOString(), synced: false });
      await send(who);
    },
    [set, send]
  );

  return { signatures, sign };
}
