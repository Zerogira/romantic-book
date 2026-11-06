import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Check, Heart, RefreshCw, RotateCcw, X } from "lucide-react";
import { fileToSquareJpeg, formatRegistroDate, squareJpeg } from "../../lib/registro";
import type { SaveOutcome } from "./RegistroProvider";
import "../../styles/registro.css";

type Phase = "starting" | "live" | "countdown" | "review" | "saving" | "done" | "blocked";
type Facing = "user" | "environment";

// Espelho: a prévia da câmera frontal é espelhada (como um espelho, o jeito natural de se
// ajustar), mas a foto salva NÃO é espelhada, para que textos (camisa, placas) fiquem legíveis
// e a foto saia como as outras pessoas a veem. É o mesmo comportamento da câmera do iPhone.
const MIRROR_SAVED_PHOTO = false;

type Props = {
  onSave: (dataUrl: string) => Promise<SaveOutcome>;
  onClose: () => void;
};

const CAPTIONS: Record<Phase, string> = {
  starting: "abrindo a câmera…",
  live: "sorria, é a nossa foto ♡",
  countdown: "ali, olhando pra cá…",
  review: "ficou do jeitinho que você quer?",
  saving: "guardando nossa lembrança…",
  done: "",
  blocked: "vamos dar um jeito ♡",
};

export default function CameraCapture({ onSave, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const runRef = useRef(0); // identifica a "abertura de câmera" mais recente

  const [phase, setPhase] = useState<Phase>("starting");
  const [facing, setFacing] = useState<Facing>("user");
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);
  const [doneDate, setDoneDate] = useState("");
  const [flash, setFlash] = useState(false);
  const [blocked, setBlocked] = useState<"denied" | "unavailable">("unavailable");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(
    async (mode: Facing) => {
      const run = ++runRef.current;
      stopStream();
      setPhase("starting");

      if (!navigator.mediaDevices?.getUserMedia) {
        setBlocked("unavailable");
        setPhase("blocked");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        // Se fechou a tela (ou pediu outra câmera) enquanto esperava a permissão, desliga
        if (run !== runRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setPhase("live");
      } catch (err) {
        if (run !== runRef.current) return;
        const name = (err as DOMException | undefined)?.name;
        setBlocked(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
        setPhase("blocked");
      }
    },
    [stopStream]
  );

  // Abre a câmera ao entrar; desliga (apaga a luzinha) ao sair
  useEffect(() => {
    startStream("user");
    return () => {
      runRef.current++;
      stopStream();
    };
  }, [startStream, stopStream]);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "saving") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const takeShot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      const dataUrl = squareJpeg(video, video.videoWidth, video.videoHeight, MIRROR_SAVED_PHOTO);
      setShot(dataUrl);
      stopStream();
      setPhase("review");
    } catch {
      setBlocked("unavailable");
      setPhase("blocked");
    }
  };

  // Contagem regressiva 3-2-1 e clique
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      setFlash(true);
      takeShot();
      const t = setTimeout(() => setFlash(false), 240);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  const flip = () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    startStream(next);
  };

  const retake = () => {
    setShot(null);
    startStream(facing);
  };

  const confirm = async () => {
    if (!shot) return;
    setPhase("saving");
    const result = await onSave(shot);
    setOutcome(result);
    setDoneDate(formatRegistroDate(new Date().toISOString()));
    setPhase("done");
  };

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToSquareJpeg(file);
      stopStream();
      setShot(dataUrl);
      setPhase("review");
    } catch {
      setBlocked("unavailable");
      setPhase("blocked");
    }
  };

  const showVideo = phase === "starting" || phase === "live" || phase === "countdown";
  const showShot = !!shot && (phase === "review" || phase === "saving" || phase === "done");
  const caption = phase === "done" ? doneDate : CAPTIONS[phase];

  return (
    <div className="cam-overlay" role="dialog" aria-modal="true" aria-label="Tirar a foto do registro">
      <button type="button" className="cam-close" onClick={onClose} disabled={phase === "saving"} aria-label="Fechar">
        <X size={20} />
      </button>

      <div className="cam-stage">
        <motion.div
          className={`cam-polaroid ${phase === "done" ? "is-done" : ""}`}
          initial={{ opacity: 0, y: 24, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: phase === "done" ? 2 : -1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cam-tape" />
          <div className="cam-photo">
            <video
              ref={videoRef}
              className={`cam-video ${facing === "user" ? "is-mirrored" : ""} ${showVideo ? "" : "is-hidden"}`}
              playsInline
              muted
              autoPlay
            />
            {showShot && (
              <img className={`cam-shot ${phase === "done" ? "is-developing" : ""}`} src={shot!} alt="Foto tirada" />
            )}

            {phase === "starting" && <div className="cam-message">abrindo a câmera…</div>}

            {phase === "countdown" && count > 0 && (
              <motion.div
                key={count}
                className="cam-count"
                initial={{ opacity: 0, scale: 1.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {count}
              </motion.div>
            )}

            {phase === "blocked" && (
              <div className="cam-message cam-blocked">
                <Camera size={22} />
                {blocked === "denied" ? (
                  <p>
                    Sem a permissão da câmera não consigo mostrar a prévia. Você pode liberar nas configurações do
                    navegador, ou tirar a foto pela câmera do celular.
                  </p>
                ) : (
                  <p>Não consegui abrir a câmera por aqui. Você pode tirar a foto pela câmera do celular.</p>
                )}
              </div>
            )}

            {flash && <div className="cam-flash" />}
          </div>
          <div className="cam-caption">{caption}</div>
        </motion.div>

        <div className="cam-controls">
          {(phase === "live" || phase === "starting") && (
            <>
              <button type="button" className="cam-icon-btn" onClick={flip} disabled={phase !== "live"} aria-label="Virar a câmera">
                <RefreshCw size={20} />
              </button>
              <button
                type="button"
                className="cam-shutter"
                onClick={() => {
                  setCount(3);
                  setPhase("countdown");
                }}
                disabled={phase !== "live"}
                aria-label="Tirar a foto"
              >
                <span />
              </button>
              <span className="cam-spacer" />
            </>
          )}

          {phase === "countdown" && (
            <button type="button" className="cam-btn" onClick={() => setPhase("live")}>
              Cancelar
            </button>
          )}

          {phase === "review" && (
            <>
              <button type="button" className="cam-btn" onClick={retake}>
                <RotateCcw size={16} /> Refazer
              </button>
              <button type="button" className="cam-btn cam-btn-primary" onClick={confirm}>
                <Check size={16} /> Usar esta foto
              </button>
            </>
          )}

          {phase === "saving" && (
            <span className="cam-saving">
              <Heart size={16} fill="currentColor" /> guardando…
            </span>
          )}

          {phase === "done" && (
            <div className="cam-done">
              <p>
                {outcome === "saved"
                  ? "Pronto! Nossa lembrança ficou guardada. Ela já está na última página do livro ♡"
                  : "Guardei no seu celular e vou tentar enviar de novo assim que a conexão voltar ♡"}
              </p>
              <button type="button" className="cam-btn cam-btn-primary" onClick={onClose}>
                <Heart size={16} fill="currentColor" /> Ver no livro
              </button>
            </div>
          )}

          {phase === "blocked" && (
            <>
              {blocked === "denied" && (
                <button type="button" className="cam-btn" onClick={() => startStream(facing)}>
                  Tentar de novo
                </button>
              )}
              <button type="button" className="cam-btn cam-btn-primary" onClick={() => fileRef.current?.click()}>
                <Camera size={16} /> Tirar pela câmera do celular
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onFileChosen(file);
        }}
      />
    </div>
  );
}
