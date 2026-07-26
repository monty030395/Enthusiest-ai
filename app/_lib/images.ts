// Phone screenshots run 1–2.5 MB each; Vercel rejects request bodies over
// ~4.5 MB, so downscale to max 1600px JPEG before they ever hit the wire.
// GPT-4o reads listing text fine at this resolution.
const MAX_IMAGE_DIM = 1600;

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(original);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve(original);
      img.src = original;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
