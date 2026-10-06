// Count bytes from the stream: Content-Length alone can be absent or misleading.
export async function readLimitedJson(request: Request, limit = 8192): Promise<unknown> {
  if (!request.headers.get('content-type')?.split(';')[0].trim().toLowerCase().endsWith('/json')) {
    throw new RequestError(415, 'Нужна е JSON заявка.');
  }
  const declared = Number(request.headers.get('content-length'));
  if (declared > limit) throw new RequestError(413, 'Заявката е твърде голяма.');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'Невалидна заявка.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new RequestError(413, 'Заявката е твърде голяма.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new RequestError(400, 'Невалидна заявка.'); }
}

export class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
