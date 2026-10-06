import { ImageMagick, initializeImageMagick, MagickFormat, MagickImageInfo, MagickReadSettings, ResourceLimits } from 'npm:@imagemagick/magick-wasm@0.0.44';
let initialization: Promise<void> | undefined;
export async function sanitizePhoto(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new Error('Invalid photo size');
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  const format = mime === 'image/png' && png ? MagickFormat.Png : mime === 'image/jpeg' && jpeg ? MagickFormat.Jpeg : mime === 'image/webp' && webp ? MagickFormat.WebP : null;
  if (!format) throw new Error('Invalid photo format');
  initialization ??= (async () => {
    const wasm = await Deno.readFile(new URL('x86/magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44')));
    await initializeImageMagick(wasm);
    ResourceLimits.memory = 128n * 1024n * 1024n;
    ResourceLimits.maxMemoryRequest = 128n * 1024n * 1024n;
    ResourceLimits.disk = 0n; ResourceLimits.width = 10000n; ResourceLimits.height = 10000n;
    ResourceLimits.listLength = 16n; ResourceLimits.maxProfileSize = 1024n * 1024n;
  })();
  await initialization;
  const settings = new MagickReadSettings({ format, frameCount: 1 });
  const info = MagickImageInfo.create(bytes, settings);
  if (!info.width || !info.height || info.width * info.height > 8_000_000) throw new Error('Photo resolution too large');
  return ImageMagick.read(bytes, settings, (image) => {
    image.autoOrient();
    if (Math.max(image.width, image.height) > 2400) {
      const ratio = 2400 / Math.max(image.width, image.height);
      image.resize(Math.round(image.width * ratio), Math.round(image.height * ratio));
    }
    image.strip(); image.quality = 85;
    return image.write(MagickFormat.Jpeg, (data) => new Uint8Array(data));
  });
}
export async function readPhotoBody(request: Request): Promise<Uint8Array> {
  const max = 5 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > max) throw new Error('Photo too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing photo');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); throw new Error('Photo too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
