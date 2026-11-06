import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchCarta, readLocalCarta, uploadCarta, writeLocalCarta, type CartaLetter } from "../../lib/carta";

// O editor só é baixado quando alguém o abre
const CartaEditor = lazy(() => import("./CartaEditor"));

export type CartaSaveOutcome = "saved" | "pending";

type CartaContextValue = {
  /** Carta de resposta (já enviada ou ainda pendente de envio). null = ainda não existe. */
  letter: CartaLetter | null;
  /** true enquanto ainda não sabemos se existe uma carta no servidor. */
  loading: boolean;
  /** true se o último envio falhou (a carta continua guardada no aparelho). */
  uploadFailed: boolean;
  openEditor: () => void;
  retryUpload: () => void;
};

const CartaContext = createContext<CartaContextValue | null>(null);

export function useCarta(): CartaContextValue {
  const ctx = useContext(CartaContext);
  if (!ctx) throw new Error("useCarta precisa estar dentro de <CartaProvider>");
  return ctx;
}

export function CartaProvider({ children }: { children: ReactNode }) {
  const [letter, setLetter] = useState<CartaLetter | null>(() => readLocalCarta());
  const [loading, setLoading] = useState(true);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const letterRef = useRef(letter);
  letterRef.current = letter;
  const uploadingRef = useRef(false);

  const apply = useCallback((next: CartaLetter | null) => {
    setLetter(next);
    writeLocalCarta(next);
  }, []);

  /** Envia uma carta pendente. Se o servidor já tinha uma, adota a do servidor. */
  const sendPending = useCallback(
    async (pending: CartaLetter): Promise<boolean> => {
      if (uploadingRef.current) return false;
      uploadingRef.current = true;
      try {
        const result = await uploadCarta(pending.text);
        if (result.kind === "failed") {
          setUploadFailed(true);
          return false;
        }
        setUploadFailed(false);
        apply({ text: result.letter.text, writtenAt: result.letter.writtenAt, synced: true });
        return true;
      } finally {
        uploadingRef.current = false;
      }
    },
    [apply]
  );

  // Ao abrir o site: confere o que existe no servidor
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const server = await fetchCarta();
        if (cancelled) return;
        if (server) {
          apply({ text: server.text, writtenAt: server.writtenAt, synced: true });
        } else {
          const local = readLocalCarta();
          if (local && !local.synced) {
            sendPending(local); // ficou pendente em outra visita: tenta enviar de novo
          } else if (local) {
            apply(null); // o servidor foi zerado (reset): esquece a cópia local
          }
        }
      } catch {
        // sem conexão (ou sem API): mantém o que existe no aparelho
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply, sendPending]);

  // Quando a internet voltar, reenvia uma carta pendente
  useEffect(() => {
    const onOnline = () => {
      const current = letterRef.current;
      if (current && !current.synced) sendPending(current);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sendPending]);

  const saveLetter = useCallback(
    async (text: string): Promise<CartaSaveOutcome> => {
      const pending: CartaLetter = { text, writtenAt: new Date().toISOString(), synced: false };
      apply(pending); // aparece na hora e fica guardada no aparelho
      setUploadFailed(false);
      return (await sendPending(pending)) ? "saved" : "pending";
    },
    [apply, sendPending]
  );

  const retryUpload = useCallback(() => {
    const current = letterRef.current;
    if (current && !current.synced) sendPending(current);
  }, [sendPending]);

  const value = useMemo<CartaContextValue>(
    () => ({ letter, loading, uploadFailed, openEditor: () => setEditorOpen(true), retryUpload }),
    [letter, loading, uploadFailed, retryUpload]
  );

  return (
    <CartaContext.Provider value={value}>
      {children}
      {editorOpen && (
        <Suspense fallback={null}>
          <CartaEditor onSave={saveLetter} onClose={() => setEditorOpen(false)} />
        </Suspense>
      )}
    </CartaContext.Provider>
  );
}
