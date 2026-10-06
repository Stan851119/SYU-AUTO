export async function preparePhoto(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  try {
    if (!image.width || !image.height || image.width * image.height > 60_000_000) throw new Error('Снимката е прекалено голяма.');
    const ratio = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не успяхме да обработим снимката.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Невалидна снимка.')), 'image/jpeg', 0.88,
    ));
  } finally { image.close(); }
}
