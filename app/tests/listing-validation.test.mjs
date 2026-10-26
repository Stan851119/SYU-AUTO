import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateListing } from '../lib/listing-validation.ts';
const valid = { make: 'Toyota', model: 'Corolla', city: 'Бургас', year: '2020', mileage: '0', price: '15900' };
test('accepts a valid listing including zero mileage', () => assert.equal(validateListing(valid), null));
test('rejects blank and oversized names', () => {
  for (const update of [{ make: '   ' }, { model: 'a'.repeat(81) }, { city: '' }]) assert.ok(validateListing({ ...valid, ...update }));
});
test('rejects missing, fractional and out-of-range numbers', () => {
  for (const update of [{ price: '0' }, { price: '15.5' }, { year: '0' }, { year: '2031' }, { mileage: '' }, { mileage: '-1' }, { mileage: 'Infinity' }, { mileage: '3000001' }]) assert.ok(validateListing({ ...valid, ...update }));
});
