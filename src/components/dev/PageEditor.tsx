import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { PageData, PageLayout } from "../../data/bookContent";
import "../../styles/editor.css";

// Editor de páginas do álbum. Só é carregado no servidor de desenvolvimento.

const LAYOUT_LABELS: Record<PageLayout, string> = {
  intro: "Introdução (texto)",
  photo: "Foto única",
  collage: "Colagem (até 2 fotos)",
  timeline: "Linha do tempo",
  details: "Pequenos detalhes",
  letter: "Carta",
  closure: "Surpresa final",
};

type Slot = { kind: "image" } | { kind: "collage"; index: 0 | 1 };

type Props = {
  pages: PageData[];
  onClose: () => void;
  onSaved: () => void;
};

export function PageEditor({ pages, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<PageData[]>(() => structuredClone(pages));
  const [selected, setSelected] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  const loadPhotos = () =>
    fetch("/__pages/photos")
      .then((r) => r.json())
      .then((list: string[]) => setPhotos(list))
      .catch(() => setPhotos([]));

  useEffect(() => {
    loadPhotos();
  }, []);

  const page = draft[selected];

  const update = (patch: Partial<PageData>) => {
    setDraft((prev) => prev.map((p, i) => (i === selected ? { ...p, ...patch } : p)));
    setDirty(true);
    setStatus("idle");
  };

  const movePage = (dir: -1 | 1) => {
    const target = selected + dir;
    if (target < 0 || target >= draft.length) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[selected], next[target]] = [next[target], next[selected]];
      return next;
    });
    setSelected(target);
    setDirty(true);
  };

  const addPage = () => {
    const newPage: PageData = {
      id: `pagina-${Date.now()}`,
      chapter: "NOVO CAPÍTULO",
      title: "Nova página",
      text: "Escreva aqui o texto desta página.",
      layout: "intro",
    };
    setDraft((prev) => [...prev.slice(0, selected + 1), newPage, ...prev.slice(selected + 1)]);
    setSelected(selected + 1);
    setDirty(true);
  };

  const removePage = () => {
    if (draft.length <= 1) return;
    if (!window.confirm(`Remover a página "${page.title}"?`)) return;
    setDraft((prev) => prev.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
    setDirty(true);
  };

  const changeLayout = (layout: PageLayout) => {
    update({ layout });
  };

  // ---- Fotos ----
  const uploadFile = async (file: File): Promise<string | null> => {
    setMessage("Enviando foto...");
    try {
      const res = await fetch(`/__pages/upload?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Falha no envio da foto");
        return null;
      }
      setMessage("Foto enviada!");
      loadPhotos();
      return data.src as string;
    } catch (err) {
      setMessage(String(err));
      return null;
    }
  };

  const assignPhoto = (src: string, target: Slot) => {
    if (target.kind === "image") {
      update({ image: src });
    } else {
      const current: string[] = [page.images?.[0] ?? "", page.images?.[1] ?? ""];
      current[target.index] = src;
      update({ images: current.filter(Boolean) });
    }
    setSlot(null);
  };

  const clearPhoto = (target: Slot) => {
    if (target.kind === "image") {
      update({ image: undefined });
    } else {
      const current: string[] = [page.images?.[0] ?? "", page.images?.[1] ?? ""];
      current[target.index] = "";
      update({ images: current.filter(Boolean) });
    }
  };

  const attachFile = async (file: File | undefined, target: Slot) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Escolha um arquivo de imagem (jpg, png, webp ou gif).");
      return;
    }
    const src = await uploadFile(file);
    if (src) assignPhoto(src, target);
  };

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>, target: Slot) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    attachFile(file, target);
  };

  // ---- Listas (linha do tempo e detalhes) ----
  const updateTimeline = (i: number, patch: Partial<NonNullable<PageData["timelineItems"]>[number]>) => {
    const items = [...(page.timelineItems ?? [])];
    items[i] = { ...items[i], ...patch };
    update({ timelineItems: items });
  };
  const addTimeline = () =>
    update({
      timelineItems: [...(page.timelineItems ?? []), { date: "Data", title: "Título", description: "Descrição" }],
    });
  const removeTimeline = (i: number) =>
    update({ timelineItems: (page.timelineItems ?? []).filter((_, idx) => idx !== i) });

  const updateDetail = (i: number, patch: Partial<NonNullable<PageData["detailsList"]>[number]>) => {
    const items = [...(page.detailsList ?? [])];
    items[i] = { ...items[i], ...patch };
    update({ detailsList: items });
  };
  const addDetail = () =>
    update({ detailsList: [...(page.detailsList ?? []), { label: "Novo detalhe", value: "Descrição" }] });
  const removeDetail = (i: number) =>
    update({ detailsList: (page.detailsList ?? []).filter((_, idx) => idx !== i) });

  // ---- Salvar ----
  const save = async () => {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/__pages/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setStatus("saved");
      setDirty(false);
      setMessage("Salvo no projeto! Recarregando o livro...");
      setTimeout(onSaved, 600);
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  const handleClose = () => {
    if (dirty && !window.confirm("Há alterações não salvas. Fechar mesmo assim?")) return;
    onClose();
  };

  // ---- Seletor de foto (galeria + envio) ----
  // Campo de foto: arrastar ou clicar para enviar; ou escolher uma foto já existente
  const renderPhotoField = (label: string, src: string | undefined, target: Slot) => (
    <div className="pe-photo-field">
      <span className="pe-label">{label}</span>
      <label
        className={`pe-dropzone ${src ? "has-photo" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          attachFile(e.dataTransfer.files?.[0], target);
        }}
      >
        {src ? (
          <img className="pe-dropzone-preview" src={src} alt="" />
        ) : (
          <span className="pe-dropzone-empty">
            <Upload size={18} />
            <strong>Clique para escolher uma foto</strong>
            <small>ou arraste uma imagem para cá</small>
          </span>
        )}
        <input type="file" accept="image/*" hidden onChange={(e) => onFileChosen(e, target)} />
      </label>
      <div className="pe-photo-actions">
        <span className="pe-file-name" title={src}>
          {src ? src.split("/").pop() : "Nenhuma foto definida"}
        </span>
        <button type="button" className="pe-btn" onClick={() => setSlot(target)}>
          Usar foto já enviada
        </button>
        {src && (
          <button type="button" className="pe-btn pe-btn-ghost" onClick={() => clearPhoto(target)}>
            Remover foto
          </button>
        )}
      </div>
    </div>
  );

  const renderLayoutFields = (): ReactNode => {
    switch (page.layout) {
      case "photo":
        return (
          <>
            {renderPhotoField("Foto", page.image, { kind: "image" })}
            <label className="pe-field">
              <span className="pe-label">Descrição da foto (acessibilidade)</span>
              <input value={page.imageAlt ?? ""} onChange={(e) => update({ imageAlt: e.target.value })} />
            </label>
          </>
        );
      case "collage":
        return (
          <>
            {renderPhotoField("Foto 1", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2", page.images?.[1], { kind: "collage", index: 1 })}
          </>
        );
      case "timeline":
        return (
          <div className="pe-list">
            <span className="pe-label">Marcos da linha do tempo</span>
            {(page.timelineItems ?? []).map((item, i) => (
              <div className="pe-item" key={i}>
                <input value={item.date} placeholder="Data" onChange={(e) => updateTimeline(i, { date: e.target.value })} />
                <input value={item.title} placeholder="Título" onChange={(e) => updateTimeline(i, { title: e.target.value })} />
                <textarea
                  rows={2}
                  value={item.description}
                  placeholder="Descrição"
                  onChange={(e) => updateTimeline(i, { description: e.target.value })}
                />
                <button type="button" className="pe-btn pe-btn-ghost" onClick={() => removeTimeline(i)}>
                  <Trash2 size={13} /> Remover marco
                </button>
              </div>
            ))}
            <button type="button" className="pe-btn" onClick={addTimeline}>
              <Plus size={13} /> Adicionar marco
            </button>
          </div>
        );
      case "details":
        return (
          <div className="pe-list">
            <span className="pe-label">Detalhes</span>
            {(page.detailsList ?? []).map((item, i) => (
              <div className="pe-item" key={i}>
                <input value={item.label} placeholder="Nome" onChange={(e) => updateDetail(i, { label: e.target.value })} />
                <textarea
                  rows={2}
                  value={item.value}
                  placeholder="Descrição"
                  onChange={(e) => updateDetail(i, { value: e.target.value })}
                />
                <button type="button" className="pe-btn pe-btn-ghost" onClick={() => removeDetail(i)}>
                  <Trash2 size={13} /> Remover detalhe
                </button>
              </div>
            ))}
            <button type="button" className="pe-btn" onClick={addDetail}>
              <Plus size={13} /> Adicionar detalhe
            </button>
          </div>
        );
      case "letter":
        return (
          <label className="pe-field">
            <span className="pe-label">Texto da carta</span>
            <textarea rows={5} value={page.letterBody ?? ""} onChange={(e) => update({ letterBody: e.target.value })} />
          </label>
        );
      case "closure":
        return (
          <label className="pe-field">
            <span className="pe-label">Mensagem secreta (aparece ao tocar)</span>
            <textarea rows={4} value={page.secretMessage ?? ""} onChange={(e) => update({ secretMessage: e.target.value })} />
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="pe-panel" aria-label="Editor de páginas">
      <header className="pe-header">
        <strong>Editar páginas</strong>
        <button type="button" className="pe-icon-btn" onClick={handleClose} aria-label="Fechar editor">
          <X size={16} />
        </button>
      </header>

      <div className="pe-body">
        <nav className="pe-pages" aria-label="Lista de páginas">
          {draft.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`pe-page-btn ${i === selected ? "is-active" : ""}`}
              onClick={() => {
                setSelected(i);
                setSlot(null);
              }}
            >
              <span className="pe-page-num">{i + 1}</span>
              <span className="pe-page-name">{p.title}</span>
            </button>
          ))}
          <div className="pe-page-tools">
            <button type="button" className="pe-icon-btn" onClick={() => movePage(-1)} disabled={selected === 0} aria-label="Mover para cima" title="Mover para cima">
              <ArrowUp size={14} />
            </button>
            <button type="button" className="pe-icon-btn" onClick={() => movePage(1)} disabled={selected === draft.length - 1} aria-label="Mover para baixo" title="Mover para baixo">
              <ArrowDown size={14} />
            </button>
            <button type="button" className="pe-icon-btn" onClick={addPage} aria-label="Nova página" title="Nova página (depois da selecionada)">
              <Plus size={14} />
            </button>
            <button type="button" className="pe-icon-btn" onClick={removePage} disabled={draft.length <= 1} aria-label="Remover página" title="Remover página">
              <Trash2 size={14} />
            </button>
          </div>
        </nav>

        <div className="pe-form">
          <label className="pe-field">
            <span className="pe-label">Layout</span>
            <select value={page.layout} onChange={(e) => changeLayout(e.target.value as PageLayout)}>
              {(Object.keys(LAYOUT_LABELS) as PageLayout[]).map((l) => (
                <option key={l} value={l}>
                  {LAYOUT_LABELS[l]}
                </option>
              ))}
            </select>
          </label>

          <label className="pe-field">
            <span className="pe-label">Capítulo</span>
            <input value={page.chapter} onChange={(e) => update({ chapter: e.target.value })} />
          </label>

          <label className="pe-field">
            <span className="pe-label">Título</span>
            <input value={page.title} onChange={(e) => update({ title: e.target.value })} />
          </label>

          <label className="pe-field">
            <span className="pe-label">Texto</span>
            <textarea rows={4} value={page.text} onChange={(e) => update({ text: e.target.value })} />
          </label>

          <label className="pe-field">
            <span className="pe-label">Observação (nota pequena)</span>
            <textarea rows={2} value={page.note ?? ""} onChange={(e) => update({ note: e.target.value })} />
          </label>

          {renderLayoutFields()}

          {slot && (
            <div className="pe-gallery">
              <div className="pe-gallery-head">
                <span>Escolha uma foto</span>
                <button type="button" className="pe-icon-btn" onClick={() => setSlot(null)} aria-label="Fechar galeria de fotos">
                  <X size={14} />
                </button>
              </div>
              {photos.length === 0 && (
                <p className="pe-hint">
                  Ainda não há fotos no projeto. Use "Clique para escolher uma foto" no campo acima: a foto enviada
                  aparece aqui depois.
                </p>
              )}
              <div className="pe-gallery-grid">
                {photos.map((src) => (
                  <button key={src} type="button" className="pe-gallery-item" onClick={() => assignPhoto(src, slot)} title={src}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="pe-footer">
        <span className={`pe-message ${status === "error" ? "is-error" : ""}`}>
          {message || (dirty ? "Alterações não salvas" : "")}
        </span>
        <button type="button" className="pe-btn pe-btn-primary" onClick={save} disabled={status === "saving"}>
          <Save size={14} /> {status === "saving" ? "Salvando..." : "Salvar no projeto"}
        </button>
      </footer>
    </aside>
  );
}
