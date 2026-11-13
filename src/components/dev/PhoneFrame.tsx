import { useEffect, useMemo, useState } from "react";
import "../../styles/phoneframe.css";

// Simulador de celular (só no servidor de desenvolvimento): abra  http://localhost:5173/?celular
// O site roda dentro de uma moldura com o tamanho de um celular, então as regras de CSS e de JS
// de "celular" valem de verdade (largura, altura, dvh, modo leitura, layout das fotos).
// Cada predefinição diz quanto da tela o navegador do celular ocupa: no Safari as barras de cima e
// de baixo roubam altura, e é por isso que no celular o livro fica menor do que no DevTools.

type Preset = {
  id: string;
  label: string;
  hint: string;
  w: number; // largura da tela
  screenH: number; // altura total da tela
  top: number; // altura da barra de cima (relógio / endereço)
  bottom: number; // altura da barra de baixo (endereço / botões / barra inicial)
};

const PRESETS: Preset[] = [
  { id: "safari", label: "iPhone 15 · Safari (barras)", hint: "393 × 659 de área útil — o caso mais comum", w: 393, screenH: 852, top: 59, bottom: 134 },
  { id: "safari-min", label: "iPhone 15 · Safari (barra recolhida)", hint: "393 × 734 — depois de rolar a página", w: 393, screenH: 852, top: 59, bottom: 59 },
  { id: "app", label: "iPhone 15 · App na tela inicial", hint: "393 × 852 — sem barras do navegador", w: 393, screenH: 852, top: 0, bottom: 0 },
  { id: "se", label: "iPhone SE · Safari (barras)", hint: "375 × 553 — celular pequeno", w: 375, screenH: 667, top: 20, bottom: 94 },
  { id: "android", label: "Android · Chrome (barras)", hint: "360 × 650 — celular comum", w: 360, screenH: 800, top: 24, bottom: 126 },
];

export default function PhoneFrame() {
  const [presetId, setPresetId] = useState(() => {
    try {
      return localStorage.getItem("dev_phone_preset") || "safari";
    } catch {
      return "safari";
    }
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [winH, setWinH] = useState(window.innerHeight);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const viewportH = preset.screenH - preset.top - preset.bottom;

  useEffect(() => {
    try {
      localStorage.setItem("dev_phone_preset", preset.id);
    } catch {
      // ignora
    }
  }, [preset.id]);

  useEffect(() => {
    const onResize = () => setWinH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Encolhe a moldura (só visualmente) se a janela do computador for mais baixa que o celular
  const scale = useMemo(() => Math.min(1, (winH - 48) / (preset.screenH + 28)), [winH, preset.screenH]);

  const src = `/?_moldura=1`;

  return (
    <div className="phone-stage">
      <aside className="phone-panel">
        <h1>Simulador de celular</h1>
        <p className="phone-note">
          A página abre dentro da moldura com o tamanho do celular. Serve para conferir o <b>layout</b>; o toque real
          (gestos) só dá para testar no celular.
        </p>
        <div className="phone-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === preset.id ? "is-active" : ""}
              onClick={() => setPresetId(p.id)}
            >
              <strong>{p.label}</strong>
              <span>{p.hint}</span>
            </button>
          ))}
        </div>
        <button type="button" className="phone-reload" onClick={() => setReloadKey((k) => k + 1)}>
          Recarregar o livro
        </button>
        <p className="phone-size">
          Área do site: <b>{preset.w} × {viewportH}</b>
          {scale < 1 && <> · exibido a {Math.round(scale * 100)}%</>}
        </p>
        <a className="phone-link" href="/" target="_blank" rel="noreferrer">
          Abrir o site normal em outra aba
        </a>
      </aside>

      <div className="phone-wrap" style={{ width: (preset.w + 28) * scale, height: (preset.screenH + 28) * scale }}>
        <div className="phone-body" style={{ width: preset.w + 28, height: preset.screenH + 28, transform: `scale(${scale})` }}>
          <div className="phone-screen" style={{ width: preset.w, height: preset.screenH }}>
            {preset.top > 0 && (
              <div className="phone-bar phone-bar-top" style={{ height: preset.top }}>
                <span>9:41</span>
                <i className="phone-island" />
              </div>
            )}
            <iframe
              key={`${preset.id}-${reloadKey}`}
              title="Site no celular"
              src={src}
              style={{ width: preset.w, height: viewportH }}
            />
            {preset.bottom > 0 && (
              <div className="phone-bar phone-bar-bottom" style={{ height: preset.bottom }}>
                <div className="phone-url">endereço do site</div>
                <i className="phone-home" />
              </div>
            )}
            {preset.top === 0 && <i className="phone-island phone-island-over" />}
          </div>
        </div>
      </div>
    </div>
  );
}
