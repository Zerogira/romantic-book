import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fetchRegistro,
  readLocalRegistro,
  uploadRegistro,
  writeLocalRegistro,
  type RegistroPhoto,
} from "../../lib/registro";

// A câmera só é baixada quando alguém a abre
const CameraCapture = lazy(() => import("./CameraCapture"));

export type SaveOutcome = "saved" | "pending";

type RegistroContextValue = {
  /** Foto do registro (já enviada ou ainda pendente de envio). null = ainda não existe. */
  photo: RegistroPhoto | null;
  /** true enquanto ainda não sabemos se existe uma foto no servidor. */
  loading: boolean;
  /** true se o último envio falhou (a foto continua guardada no aparelho). */
  uploadFailed: boolean;
  openCamera: () => void;
  retryUpload: () => void;
};

const RegistroContext = createContext<RegistroContextValue | null>(null);

export function useRegistro(): RegistroContextValue {
  const ctx = useContext(RegistroContext);
  if (!ctx) throw new Error("useRegistro precisa estar dentro de <RegistroProvider>");
  return ctx;
}

export function RegistroProvider({ children }: { children: ReactNode }) {
  const [photo, setPhoto] = useState<RegistroPhoto | null>(() => readLocalRegistro());
  const [loading, setLoading] = useState(true);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const photoRef = useRef(photo);
  photoRef.current = photo;
  const uploadingRef = useRef(false);

  const apply = useCallback((next: RegistroPhoto | null) => {
    setPhoto(next);
    writeLocalRegistro(next);
  }, []);

  /** Envia uma foto pendente. Se o servidor já tinha uma foto, adota a do servidor. */
  const sendPending = useCallback(
    async (pending: RegistroPhoto): Promise<boolean> => {
      if (uploadingRef.current) return false;
      uploadingRef.current = true;
      try {
        const result = await uploadRegistro(pending.src);
        if (result.kind === "failed") {
          setUploadFailed(true);
          return false;
        }
        setUploadFailed(false);
        apply({ src: result.photo.url, takenAt: result.photo.takenAt, synced: true });
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
        const server = await fetchRegistro();
        if (cancelled) return;
        if (server) {
          apply({ src: server.url, takenAt: server.takenAt, synced: true });
        } else {
          const local = readLocalRegistro();
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

  // Quando a internet voltar, reenvia uma foto pendente
  useEffect(() => {
    const onOnline = () => {
      const current = photoRef.current;
      if (current && !current.synced) sendPending(current);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sendPending]);

  const saveCaptured = useCallback(
    async (dataUrl: string): Promise<SaveOutcome> => {
      const pending: RegistroPhoto = { src: dataUrl, takenAt: new Date().toISOString(), synced: false };
      apply(pending); // aparece na hora e fica guardada no aparelho
      setUploadFailed(false);
      return (await sendPending(pending)) ? "saved" : "pending";
    },
    [apply, sendPending]
  );

  const retryUpload = useCallback(() => {
    const current = photoRef.current;
    if (current && !current.synced) sendPending(current);
  }, [sendPending]);

  const value = useMemo<RegistroContextValue>(
    () => ({ photo, loading, uploadFailed, openCamera: () => setCameraOpen(true), retryUpload }),
    [photo, loading, uploadFailed, retryUpload]
  );

  return (
    <RegistroContext.Provider value={value}>
      {children}
      {cameraOpen && (
        <Suspense fallback={null}>
          <CameraCapture onSave={saveCaptured} onClose={() => setCameraOpen(false)} />
        </Suspense>
      )}
    </RegistroContext.Provider>
  );
}
