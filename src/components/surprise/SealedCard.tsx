import { SIGNERS, formatSealedAt, sealedAtOf, type Signatures } from "../../lib/assinatura";
import "../../styles/surprise.css";

type Props = {
  /** A promessa da carta. */
  message: string;
  signatures: Signatures;
  /** Escondido (mas ocupando o lugar) enquanto a carta ainda está voando até aqui. */
  hidden: boolean;
};

/**
 * Cartão que fica na página depois que os dois assinam a promessa: a mensagem de encerramento,
 * as duas assinaturas e a data e a hora em que foi selado.
 */
export function SealedCard({ message, signatures, hidden }: Props) {
  const sealedAt = sealedAtOf(signatures);
  if (!sealedAt) return null;

  return (
    <div className={`sealed-card ${hidden ? "is-hidden" : ""}`}>
      <p className="sealed-title">Este capítulo agora pertence a nós dois.</p>
      <p className="sealed-promise">“{message}”</p>
      <div className="sealed-signs">
        {SIGNERS.map(({ id, label }) => (
          <div key={id} className="sealed-sig">
            <img src={signatures[id]?.image} alt={`Assinatura de ${label}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <time className="sealed-date" dateTime={sealedAt}>
        {formatSealedAt(sealedAt)}
      </time>
    </div>
  );
}
