import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { readPhotoBody, sanitizePhoto } from '../_shared/photo.ts';
const origins = new Set(['https://mmcauto.bg', 'https://www.mmcauto.bg', 'https://syu-auto.vercel.app']);
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-listing-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  };
  if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers });
  if (origin && !origins.has(origin)) return respond(403, 'Непозволен източник.');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond(405, 'Непозволена заявка.');
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return respond(401, 'Влез в профила си.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser(bearer);
  if (authError || !user?.email_confirmed_at || user.is_anonymous) return respond(401, 'Нужен е потвърден профил.');
  const listingId = request.headers.get('x-listing-id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) return respond(400, 'Невалидна обява.');
  const { data: listing } = await userClient.from('car_listings').select('id,seller_id,status').eq('id', listingId).single();
  if (!listing || listing.seller_id !== user.id || !['draft', 'pending', 'active'].includes(listing.status)) return respond(403, 'Нямаш достъп до тази обява.');
  const { data: allowed, error: quotaError } = await userClient.rpc('consume_marketplace_quota', { action: 'photo' });
  if (quotaError) return respond(503, 'Проверката временно не е достъпна.');
  if (!allowed) return respond(429, 'Достигнат е лимитът за снимки. Опитай по-късно.');
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const prefix = `${user.id}/${listingId}`;
  const { data: files, error: listError } = await admin.storage.from('car-photos').list(prefix, { limit: 33 });
  if (listError) return respond(503, 'Снимките временно не са достъпни.');
  if ((files?.length || 0) >= 32) return respond(429, 'Достигнат е лимитът за файлове на обявата.');
  let sanitized: Uint8Array;
  try { sanitized = await sanitizePhoto(await readPhotoBody(request), request.headers.get('content-type')?.split(';')[0] || ''); }
  catch { return respond(400, 'Файлът не е валидна снимка. Избери JPG, PNG или WebP до 5 MB.'); }
  const path = `${prefix}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage.from('car-photos').upload(path, sanitized, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) return respond(503, 'Не успяхме да запишем снимката.');
  return new Response(JSON.stringify({ path }), { status: 200, headers });
});
