import { useEffect, useState } from "react";
import config from "../../data/config.json";

const START = new Date(config.relationshipStart).getTime();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Tempo juntos, ao vivo: dias, horas, minutos e segundos desde config.relationshipStart. */
export function TogetherCounter() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (Number.isNaN(START) || now < START) return null;

  const total = Math.floor((now - START) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return (
    <div className="together-counter" role="timer" aria-label="Tempo que estamos juntos">
      <span className="together-label">juntos há</span>
      <div className="together-units">
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
