import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { loadActiveListing } from '../lib/marketplace.ts';
const id = '00000000-0000-4000-8000-000000000061';
function clientFor(fetch) {
  return createClient('https://example.supabase.co', 'test-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch },
  });
}
test('loads an older active listing directly without a feed limit', async () => {
  const client = clientFor(async (input) => {
    const url = new URL(input);
    assert.equal(url.pathname, '/rest/v1/car_listings');
    assert.equal(url.searchParams.get('id'), `eq.${id}`);
    assert.equal(url.searchParams.get('status'), 'eq.active');
    assert.equal(url.searchParams.has('limit'), false);
    return Response.json([{ id, make: 'Toyota', model: 'Corolla', photo_paths: [] }]);
  });
  const row = await loadActiveListing(id, client);
  assert.equal(row.id, id);
  assert.deepEqual(row.imageUrls, []);
});
test('returns null for a removed or unpublished listing', async () => {
  assert.equal(await loadActiveListing(id, clientFor(async () => Response.json([]))), null);
});
test('malformed IDs do not send database requests', async () => {
  const client = clientFor(() => { throw new Error('must not fetch'); });
  assert.equal(await loadActiveListing('not-a-uuid', client), null);
});
test('surfaces server errors instead of treating them as a missing listing', async () => {
  const client = clientFor(async () => Response.json({ message: 'Unavailable' }, { status: 503 }));
  await assert.rejects(loadActiveListing(id, client), (error) => error.message === "Unavailable");
});
