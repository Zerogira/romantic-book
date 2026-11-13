import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, ChevronsRight, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { PageData, PageLayout } from "../../data/bookContent";
import type { StickerItem, StickerType } from "../../data/stickersConfig";
import { applyStickerEdits, stickerEdit, stickersOf, useStickerEdit, type StickerScope } from "../../lib/stickerEdit";
import { fetchStickerAssets } from "../../lib/stickerAssets";
import "../../styles/editor.css";

// Editor de páginas do álbum. Só é carregado no servidor de desenvolvimento.

const LAYOUT_LABELS: Record<PageLayout, string> = {
  intro: "Introdução (texto)",
  photo: "Foto única",
  destaque: "Foto em destaque (grande, centralizada)",
  collage: "Colagem (até 2 fotos)",
  trio: "Trio (3 fotos: 2 em cima, 1 embaixo)",
  quad: "Quarteto (4 fotos: 2 em cima, 2 embaixo)",
  trioInvertido: "Trio invertido (1 em cima, 2 embaixo)",
  trioVertical: "Trio vertical (3 fotos em pé: 2 em cima, 1 embaixo)",
  zigzag: "Zigue-zague (3 fotos em diagonal)",
  trioHorizontal: "Trio horizontal (3 fotos deitadas, uma sobre a outra)",
  timeline: "Linha do tempo",
  details: "Pequenos detalhes",
  letter: "Carta",
  closure: "Surpresa final",
  registro: "Registro (foto tirada no dia)",
  resposta: "Carta de resposta (ela escreve)",
  trancada: "Página trancada (abre em uma data)",
};

type Slot = { kind: "image" } | { kind: "collage"; index: 0 | 1 | 2 | 3 };

/** Mantém a posição de cada foto; só tira os espaços vazios do fim da lista. */
function trimImages(images: string[]): string[] {
  const out = [...images];
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

const STICKER_PRESETS: { type: StickerType; label: string; caption?: string }[] = [
  { type: "cat-pink", label: "Gatinho rosa" },
  { type: "cat-blue", label: "Gatinho azul" },
  { type: "stars-cluster", label: "Estrelinhas" },
  { type: "sticky-note", label: "Bilhetinho", caption: "escreva aqui" },
  { type: "polaroid", label: "Polaroid", caption: "nós dois" },
];

type Props = {
  pages: PageData[];
  /** Página (0 = primeira página de conteúdo) que o editor abre selecionada. */
  initialPage?: number;
  /** Pede ao livro para abrir na página escolhida (número do livro: a capa é 0). */
  onGoToPage?: (pageIndex: number) => void;
  onClose: () => void;
  onSaved: () => void;
  /** Atualiza o livro com as páginas aplicadas, sem recarregar a tela nem fechar o editor. */
  onApply: (pages: PageData[]) => void;
};

export function PageEditor({ pages, initialPage = 0, onGoToPage, onClose, onSaved, onApply }: Props) {
  const [draft, setDraft] = useState<PageData[]>(() => structuredClone(pages));
  const [selected, setSelected] = useState(initialPage);
  const [collapsed, setCollapsed] = useState(false);
  const edit = useStickerEdit();
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

  // Figurinhas: o livro mostra ao vivo o que está sendo editado aqui
  useEffect(() => {
    stickerEdit.enable();
    return () => stickerEdit.reset();
  }, []);
  useEffect(() => {
    if (page) stickerEdit.setPage(page.id);
  }, [page?.id]);

  const scope: StickerScope = edit.scope;
  const stickerList = page ? stickersOf(page, scope, edit) : [];
  const selectedSticker = stickerList.find((s) => s.id === edit.selectedId);

  const setStickers = (list: StickerItem[]) => {
    stickerEdit.setList(page.id, scope, list);
    setDirty(true);
    setStatus("idle");
  };

  const addSticker = (item: Omit<StickerItem, "id" | "x" | "y" | "rotation">) => {
    const id = `s-${Date.now().toString(36)}`;
    // Dentro da página: no meio; ao redor: na margem esquerda do livro
    const start = scope === "inner" ? { x: 50, y: 62 } : { x: 9, y: 45 };
    setStickers([...stickerList, { id, ...start, rotation: 0, scale: 1, ...item }]);
    stickerEdit.select(scope, id);
  };

  const patchSticker = (patch: Partial<StickerItem>) => {
    if (!selectedSticker) return;
    setStickers(stickerList.map((s) => (s.id === selectedSticker.id ? { ...s, ...patch } : s)));
  };

  const removeSticker = () => {
    if (!selectedSticker) return;
    setStickers(stickerList.filter((s) => s.id !== selectedSticker.id));
    stickerEdit.select(scope, null);
  };

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
      const current = [0, 1, 2, 3].map((i) => page.images?.[i] ?? "");
      current[target.index] = src;
      update({ images: trimImages(current) });
    }
    setSlot(null);
  };

  const clearPhoto = (target: Slot) => {
    if (target.kind === "image") {
      update({ image: undefined });
    } else {
      const current = [0, 1, 2, 3].map((i) => page.images?.[i] ?? "");
      current[target.index] = "";
      update({ images: trimImages(current) });
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

  // Galeria de figurinhas: a mesma fonte do "Editar Figurinhas" da área inicial
  const [stickerGalleryOpen, setStickerGalleryOpen] = useState(false);
  const [stickerAssets, setStickerAssets] = useState<string[]>([]);
  useEffect(() => {
    if (!stickerGalleryOpen || stickerAssets.length > 0) return;
    fetchStickerAssets()
      .then(setStickerAssets)
      .catch(() => setMessage("Não foi possível listar as figurinhas."));
  }, [stickerGalleryOpen, stickerAssets.length]);

  const addStickerFromGallery = (src: string) => {
    const name = src.split("/").pop() ?? "figurinha";
    addSticker({ type: "gif", label: name, src });
    setStickerGalleryOpen(false);
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

  // ---- Salvar / Aplicar ----
  // Grava o pages.json e devolve as páginas gravadas (ou null se falhar)
  const persist = async (): Promise<PageData[] | null> => {
    setStatus("saving");
    setMessage("");
    try {
      const toSave = applyStickerEdits(draft, stickerEdit.getState().overrides);
      const res = await fetch("/__pages/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setStatus("saved");
      setDirty(false);
      return toSave;
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
      return null;
    }
  };

  // Salvar: grava e recarrega a página inteira (o livro começa do zero)
  const save = async () => {
    if (!(await persist())) return;
    setMessage("Salvo no projeto! Recarregando o livro...");
    setTimeout(onSaved, 600);
  };

  // Aplicar: grava e atualiza o livro ao vivo; o editor continua aberto para seguir editando
  const apply = async () => {
    const saved = await persist();
    if (!saved) return;
    onApply(saved);
    setMessage("Aplicado no livro! Pode seguir editando.");
  };

  const handleClose = () => {
    if ((dirty || Object.keys(stickerEdit.getState().overrides).length > 0) && !window.confirm("Há alterações não salvas. Fechar mesmo assim?")) return;
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
      case "destaque":
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
      case "trioVertical":
        return (
          <>
            {renderPhotoField("Foto 1 (em cima, à esquerda)", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2 (em cima, à direita)", page.images?.[1], { kind: "collage", index: 1 })}
            {renderPhotoField("Foto 3 (embaixo, no centro)", page.images?.[2], { kind: "collage", index: 2 })}
          </>
        );
      case "trioHorizontal":
        return (
          <>
            {renderPhotoField("Foto 1 (em cima, à esquerda)", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2 (no meio, à direita)", page.images?.[1], { kind: "collage", index: 1 })}
            {renderPhotoField("Foto 3 (embaixo, à esquerda)", page.images?.[2], { kind: "collage", index: 2 })}
          </>
        );
      case "zigzag":
        return (
          <>
            {renderPhotoField("Foto 1 (esquerda, no alto)", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2 (direita, no meio)", page.images?.[1], { kind: "collage", index: 1 })}
            {renderPhotoField("Foto 3 (esquerda, embaixo)", page.images?.[2], { kind: "collage", index: 2 })}
          </>
        );
      case "trioInvertido":
        return (
          <>
            {renderPhotoField("Foto 1 (em cima, horizontal)", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2 (embaixo, à esquerda)", page.images?.[1], { kind: "collage", index: 1 })}
            {renderPhotoField("Foto 3 (embaixo, à direita)", page.images?.[2], { kind: "collage", index: 2 })}
          </>
        );
      case "quad":
        return (
          <>
            {renderPhotoField("Foto 1 (em cima, à esquerda)", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2 (em cima, à direita)", page.images?.[1], { kind: "collage", index: 1 })}
            {renderPhotoField("Foto 3 (embaixo, à esquerda)", page.images?.[2], { kind: "collage", index: 2 })}
            {renderPhotoField("Foto 4 (embaixo, à direita)", page.images?.[3], { kind: "collage", index: 3 })}
          </>
        );
      case "trio":
        return (
          <>
            {renderPhotoField("Foto 1 (em cima, à esquerda)", page.images?.[0], { kind: "collage", index: 0 })}
            {renderPhotoField("Foto 2 (em cima, à direita)", page.images?.[1], { kind: "collage", index: 1 })}
            {renderPhotoField("Foto 3 (embaixo, horizontal)", page.images?.[2], { kind: "collage", index: 2 })}
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
    <aside className={`pe-panel ${collapsed ? "is-collapsed" : ""}`} aria-label="Editor de páginas">
      <header className="pe-header">
        <button
          type="button"
          className="pe-icon-btn"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Mostrar painel" : "Recolher painel"}
          title={collapsed ? "Mostrar painel" : "Recolher painel (para ver o livro inteiro)"}
        >
          <ChevronsRight size={16} style={{ transform: collapsed ? "rotate(180deg)" : undefined }} />
        </button>
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
                onGoToPage?.(i + 1);
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

          <section className="pe-stickers" aria-label="Figurinhas desta página">
            <span className="pe-label">Figurinhas desta página</span>
            <div className="pe-seg">
              <button type="button" className={`pe-btn ${scope === "inner" ? "is-active" : ""}`} onClick={() => stickerEdit.setScope("inner")}>
                Na página
              </button>
              <button type="button" className={`pe-btn ${scope === "outer" ? "is-active" : ""}`} onClick={() => stickerEdit.setScope("outer")}>
                Ao redor do livro
              </button>
            </div>
            <p className="pe-hint">
              {scope === "inner"
                ? "Arraste a figurinha direto na página do livro. Depois de salva, ela vira só decoração: clicar em cima dela vira a página."
                : "Ficam em volta do livro, só no computador, e aparecem quando esta página está aberta. Se o painel cobrir o lugar, use a seta no topo para recolhê-lo."}
            </p>
            <div className="pe-add-row">
              {STICKER_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  className="pe-btn"
                  onClick={() => addSticker({ type: preset.type, label: preset.label, caption: preset.caption })}
                >
                  <Plus size={12} /> {preset.label}
                </button>
              ))}
              <button
                type="button"
                className={`pe-btn ${stickerGalleryOpen ? "is-active" : ""}`}
                onClick={() => setStickerGalleryOpen((open) => !open)}
              >
                <Plus size={12} /> Figurinha ou imagem
              </button>
            </div>

            {stickerGalleryOpen && (
              <div className="pe-gallery">
                <div className="pe-gallery-head">
                  <span>Escolha uma figurinha</span>
                  <button type="button" className="pe-icon-btn" onClick={() => setStickerGalleryOpen(false)} aria-label="Fechar galeria de figurinhas">
                    <X size={14} />
                  </button>
                </div>
                {stickerAssets.length === 0 && (
                  <p className="pe-hint">Nenhuma figurinha em public/images/figurinhas.</p>
                )}
                <div className="pe-gallery-grid">
                  {stickerAssets.map((src) => (
                    <button key={src} type="button" className="pe-gallery-item" onClick={() => addStickerFromGallery(src)} title={src.split("/").pop()}>
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stickerList.length > 0 && (
              <div className="pe-sticker-list">
                {stickerList.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`pe-btn ${s.id === edit.selectedId ? "is-active" : ""}`}
                    onClick={() => stickerEdit.select(scope, s.id)}
                  >
                    {i + 1}. {s.label}
                  </button>
                ))}
              </div>
            )}

            {selectedSticker && (
              <div className="pe-sticker-controls">
                <label className="pe-range-row">
                  <span className="pe-label">Tamanho</span>
                  <input type="range" min={0.3} max={3} step={0.05} value={selectedSticker.scale ?? 1} onChange={(e) => patchSticker({ scale: Number(e.target.value) })} />
                  <span>{Math.round((selectedSticker.scale ?? 1) * 100)}%</span>
                </label>
                <label className="pe-range-row">
                  <span className="pe-label">Giro</span>
                  <input type="range" min={-45} max={45} step={1} value={selectedSticker.rotation} onChange={(e) => patchSticker({ rotation: Number(e.target.value) })} />
                  <span>{selectedSticker.rotation}°</span>
                </label>
                {(selectedSticker.type === "sticky-note" || selectedSticker.type === "polaroid") && (
                  <label className="pe-field">
                    <span className="pe-label">Texto</span>
                    <input value={selectedSticker.caption ?? ""} onChange={(e) => patchSticker({ caption: e.target.value })} />
                  </label>
                )}
                <button type="button" className="pe-btn pe-btn-ghost" onClick={removeSticker}>
                  <Trash2 size={13} /> Remover figurinha
                </button>
              </div>
            )}
          </section>

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
        <button
          type="button"
          className="pe-btn"
          onClick={apply}
          disabled={status === "saving"}
          title="Grava e atualiza o livro sem fechar o editor"
        >
          <Check size={14} /> Aplicar
        </button>
        <button type="button" className="pe-btn pe-btn-primary" onClick={save} disabled={status === "saving"}>
          <Save size={14} /> {status === "saving" ? "Salvando..." : "Salvar no projeto"}
        </button>
      </footer>
    </aside>
  );
}
