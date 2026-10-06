import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLimitedJson, RequestError } from '../lib/request-security.ts';

function request(body, headers = {}) {
  return new Request('https://mmcauto.bg/api/assistant', {
    method: 'POST', body, headers: { 'content-type': 'application/json', ...headers },
  });
}
test('accepts a valid Bulgarian JSON message', async () => {
  assert.deepEqual(await readLimitedJson(request('{"message":"Здравей"}')), { message: 'Здравей' });
});
test('counts actual UTF-8 bytes even without Content-Length', async () => {
  await assert.rejects(readLimitedJson(request(JSON.stringify('я'.repeat(5000)))),
    (e) => e instanceof RequestError && e.status === 413);
});
test('rejects oversized bodies even with a falsely small Content-Length', async () => {
  await assert.rejects(readLimitedJson(request(' '.repeat(9000), { 'content-length': '1' })),
    (e) => e instanceof RequestError && e.status === 413);
});
test('rejects malformed JSON and unsupported content types', async () => {
  await assert.rejects(readLimitedJson(request('{')), (e) => e instanceof RequestError && e.status === 400);
  await assert.rejects(readLimitedJson(request('{}', { 'content-type': 'text/plain' })),
    (e) => e instanceof RequestError && e.status === 415);
});
