import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
Deno.serve(async (request: Request) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const respond = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
  if (request.method !== 'POST') return respond(405, { error: 'POST required' });
  const token = request.headers.get('x-backup-token');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return respond(401, { error: 'Unauthorized' });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: snapshot, error: denied } = await admin.rpc('marketplace_backup_snapshot', { job_token: token });
  if (denied || !snapshot) return respond(401, { error: 'Unauthorized' });
  const { data: runId, error: logError } = await admin.rpc('marketplace_backup_log', { run_id: null, run_status: 'running', path: null, failure: null });
  if (logError || !runId) return respond(503, { error: 'Backup log unavailable' });
  try {
    const paths = [...new Set<string>(snapshot.car_listings.flatMap((listing: { photo_paths: string[] }) => listing.photo_paths))];
    const photos = [];

    for (const path of paths) {
      const { data, error } = await admin.storage.from('car-photos').download(path);
      if (error || !data) throw new Error('Referenced photo could not be archived');
      const bytes = new Uint8Array(await data.arrayBuffer());
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      const sha256 = [...digest].map((n) => n.toString(16).padStart(2, '0')).join('');
      const backupPath = `photos/${sha256}`;
      const { error: photoError } = await admin.storage.from('marketplace-backups').upload(backupPath, bytes, { contentType: 'application/octet-stream', upsert: false });
      if (photoError && String(photoError.statusCode) !== '409') throw new Error('Photo archive failed');
      photos.push({ path, backup_path: backupPath, content_type: data.type, sha256, bytes: data.size });
      const { data: saved, error: readError } = await admin.storage.from('marketplace-backups').download(backupPath);
      if (readError || !saved) throw new Error('Photo backup verification failed');
      const storedDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', await saved.arrayBuffer()));
      if ([...storedDigest].map(n => n.toString(16).padStart(2, '0')).join('') !== sha256) throw new Error('Photo backup checksum mismatch');
    }
    const json = new TextEncoder().encode(JSON.stringify({ ...snapshot, photos }));
    const archive = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
    const path = `${new Date().toISOString().slice(0, 10)}/${runId}.json.gz`;
    const { error } = await admin.storage.from('marketplace-backups').upload(path, archive, { contentType: 'application/gzip', upsert: false });
    if (error) throw new Error('Archive upload failed');
    const { data: savedArchive, error: archiveError } = await admin.storage.from('marketplace-backups').download(path);
    if (archiveError || !savedArchive) throw new Error('Archive verification failed');
    const restored = await new Response(savedArchive.stream().pipeThrough(new DecompressionStream('gzip'))).json();
    if (JSON.stringify(restored) !== new TextDecoder().decode(json)) throw new Error('Archive restoration mismatch');
    // Retain 14 days of daily metadata. Shared immutable photo objects are retained.
    const { data: folders, error: foldersError } = await admin.storage.from('marketplace-backups').list('', { limit: 1000 });
    if (foldersError) throw new Error('Backup retention check failed');
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    for (const folder of folders || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(folder.name) || folder.name >= cutoff) continue;
      const { data: old, error: oldError } = await admin.storage.from('marketplace-backups').list(folder.name, { limit: 1000 });
      if (oldError) throw new Error('Backup retention listing failed');
      if (old?.length) { const { error: removeError } = await admin.storage.from('marketplace-backups').remove(old.map(item => `${folder.name}/${item.name}`)); if (removeError) throw new Error('Backup retention cleanup failed'); }
    }
    const { error: finishError } = await admin.rpc('marketplace_backup_log', { run_id: runId, run_status: 'success', path, failure: null });
    if (finishError) throw new Error('Backup completion could not be recorded');
    return respond(200, { path, listings: snapshot.car_listings.length, photos: photos.length, bytes: archive.size, verified: true });
  } catch (error) {
    await admin.rpc('marketplace_backup_log', { run_id: runId, run_status: 'failed', path: null, failure: error instanceof Error ? error.message : 'Backup failed' });
    return respond(503, { error: 'Backup failed; inspect private backup_runs' });
  }
});
