export async function fileToDataUrl(file: File, maxBytes = 5 * 1024 * 1024): Promise<string> {
  if (file.size > maxBytes) throw new Error("Image is larger than 5MB.");
  if (!/image\/(jpeg|png|webp)/.test(file.type))
    throw new Error("Only JPG, PNG, or WEBP are supported.");
  // Downscale to keep localStorage lean.
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Failed to read file."));
    r.readAsDataURL(file);
  });
  return await resizeDataUrl(dataUrl, 900);
}

async function resizeDataUrl(dataUrl: string, maxSide: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Bad image."));
    img.src = src;
  });
}