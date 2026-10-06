import { sanitizePhoto, readPhotoBody } from './photo.ts';
import { ImageMagick, MagickFormat, MagickColor } from 'npm:@imagemagick/magick-wasm@0.0.44';
function assert(ok: boolean, message: string) { if (!ok) throw new Error(message); }
async function rejects(task: () => Promise<unknown>) { try { await task(); } catch { return; } throw new Error('Expected rejection'); }
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8//8/AwMDEwMDAwMDAwAkBgMB/DXemwAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
Deno.test('real decoding strips appended executable content and returns a fresh JPEG', async () => {
 const marker = new TextEncoder().encode('<script>alert("payload")</script>');
 const input = new Uint8Array(png.length + marker.length); input.set(png);input.set(marker,png.length);
 const result=await sanitizePhoto(input,'image/png');
 assert(result[0]===255 && result[1]===216,'Not JPEG');
 assert(!new TextDecoder().decode(result).includes('payload'),'Payload survived');
});
Deno.test('rejects spoofed type and corrupted image', async () => {
 await rejects(()=>sanitizePhoto(png,'image/jpeg'));
 await rejects(()=>sanitizePhoto(new Uint8Array([255,216,255,0,1,2]),'image/jpeg'));
});
Deno.test('rejects oversized streamed body without trusting Content-Length', async () => {
 await rejects(()=>readPhotoBody(new Request('https://test.invalid',{method:'POST',headers:{'Content-Length':'1'},body:new Uint8Array(5*1024*1024+1)})));
});
Deno.test('accepts JPEG and WebP, rejects decompression bombs',async()=>{
 await sanitizePhoto(png,'image/png');
 for(const format of [MagickFormat.Jpeg,MagickFormat.WebP]){
  const bytes=ImageMagick.read(new MagickColor('white'),2,2,img=>img.write(format,data=>new Uint8Array(data)));
  const output=await sanitizePhoto(bytes,format===MagickFormat.Jpeg?'image/jpeg':'image/webp');
  assert(output.length>0,'Empty output');
 }
 const large=ImageMagick.read(new MagickColor('white'),3000,3000,img=>img.write(MagickFormat.Png,data=>new Uint8Array(data)));
 await rejects(()=>sanitizePhoto(large,'image/png'));
});
