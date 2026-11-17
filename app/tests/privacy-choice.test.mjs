import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChoice, serializeChoice, CHOICE_LIFETIME } from '../lib/privacy-choice.ts';
const now = 1800000000000;
test('missing, malformed, future and old consent never enable tracking', () => {
  for (const raw of [null,'broken','{}',JSON.stringify({version:1,analytics:'true',savedAt:now}),serializeChoice(true,now+1),serializeChoice(true,now-CHOICE_LIFETIME),JSON.stringify({version:0,analytics:true,savedAt:now})]) assert.equal(parseChoice(raw,now),null);
});
test('explicit acceptance and rejection stay distinct until expiry', () => {
  assert.equal(parseChoice(serializeChoice(true,now),now).analytics,true);
  assert.equal(parseChoice(serializeChoice(false,now),now).analytics,false);
  assert.equal(parseChoice(serializeChoice(true,now),now+CHOICE_LIFETIME),null);
});
