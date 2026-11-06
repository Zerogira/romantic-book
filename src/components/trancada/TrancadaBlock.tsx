import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { fetchTrancada, formatUnlockDate, readCachedMessage, type TrancadaStatus } from "../../lib/trancada";
import { HandwrittenText } from "../ui/HandwrittenText";
import "../../styles/extras.css";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Props = { active: boolean };

/** Conteúdo da página trancada: cadeado com contagem regressiva, e a mensagem depois da data. */
export function TrancadaBlock({ active }: Props) {
  const [status, setStatus] = useState<TrancadaStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [cachedMessage] = useState(() => readCachedMessage());
  const [remainingMs, setRemainingMs] = useState(0);
  const offsetRef = useRef(0); // relógio do servidor menos o do celular
  const refetchedRef = useRef(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const data = await fetchTrancada();
      if (data.configured) offsetRef.current = Date.parse(data.now) - Date.now();
      refetchedRef.current = false;
      setStatus(data);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Contagem regressiva: usa a hora do servidor, então mudar o relógio do celular não adianta
  const locked = status?.configured && status.locked ? status : null;
  useEffect(() => {
    if (!locked) return;
    const unlockAt = Date.parse(locked.unlockAt);
    const tick = () => {
      const remaining = unlockAt - (Date.now() + offsetRef.current);
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0 && !refetchedRef.current) {
        refetchedRef.current = true;
        load(); // chegou a hora: pergunta ao servidor pela mensagem
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [locked, load]);

  // Liberada
  const unlockedMessage =
    status?.configured && !status.locked ? status.message : failed && cachedMessage !== null ? cachedMessage : null;
  if (unlockedMessage !== null) {
    return (
      <div className="trancada-block is-open">
        <LockOpen size={30} className="trancada-icon" />
        <p className="trancada-message">
          <HandwrittenText text={unlockedMessage} active={active} />
        </p>
      </div>
    );
  }

  // Trancada, com contagem regressiva
  if (locked) {
    const total = Math.floor(remainingMs / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return (
      <div className="trancada-block">
        <Lock size={30} className="trancada-icon is-locked" />
        <span className="trancada-label">abre em {formatUnlockDate(locked.unlockAt)}</span>
        <div className="trancada-count" role="timer" aria-label="Tempo até a página abrir">
          <span>
            <strong>{days}</strong> {days === 1 ? "dia" : "dias"}
          </span>
          <span>
            <strong>{pad(hours)}</strong> h
          </span>
          <span>
            <strong>{pad(minutes)}</strong> min
          </span>
          <span>
            <strong>{pad(seconds)}</strong> s
          </span>
        </div>
      </div>
    );
  }

  // Sem data configurada, carregando ou sem conexão
  return (
    <div className="trancada-block">
      <Lock size={30} className="trancada-icon is-locked" />
      <span className="trancada-label">
        {failed ? "Não consegui verificar agora." : status && !status.configured ? "Em breve ♡" : "…"}
      </span>
      {failed && (
        <button type="button" className="registro-link" onClick={load}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
