// Gera a polaroid como imagem (PNG) para ela guardar na galeria do celular.

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 60;

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  return img;
}

export async function renderPolaroidBlob(imageSrc: string, dateText: string): Promise<Blob> {
  // Garante que a fonte manuscrita já foi carregada antes de desenhar o texto
  try {
    await document.fonts.load('84px "Caveat"');
  } catch {}

  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");

  // Papel da polaroid
  ctx.fillStyle = "#fffdf9";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Foto quadrada (recorte central, caso a imagem não seja quadrada)
  const side = WIDTH - MARGIN * 2;
  const crop = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(
    img,
    (img.naturalWidth - crop) / 2,
    (img.naturalHeight - crop) / 2,
    crop,
    crop,
    MARGIN,
    MARGIN,
    side,
    side
  );

  // Data e título, no estilo manuscrito
  ctx.textAlign = "center";
  ctx.fillStyle = "#7b4f57";
  ctx.font = '88px "Caveat", cursive';
  ctx.fillText(dateText, WIDTH / 2, MARGIN + side + 150);
  ctx.fillStyle = "#b08a8e";
  ctx.font = '52px "Caveat", cursive';
  ctx.fillText("365 dias de nós ♡", WIDTH / 2, MARGIN + side + 235);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("não foi possível gerar a imagem"))), "image/png");
  });
}

export type SaveResult = "shared" | "downloaded" | "cancelled";

/**
 * No celular, abre a folha de compartilhamento (no iPhone tem "Salvar Imagem", que vai
 * para a galeria). Onde isso não existir, baixa o arquivo.
 */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return "cancelled";
      // qualquer outro erro: cai para o download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
