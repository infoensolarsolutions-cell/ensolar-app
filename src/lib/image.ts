// Browser-side image downscaling so phone photos upload fast and small.
export async function downscaleImage(
  file: File,
  maxW = 1600,
  quality = 0.82,
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not process the image."))),
        "image/jpeg",
        quality,
      ),
    );
  } catch {
    // Format the browser can't decode (rare) — upload the original instead.
    return file;
  }
}
