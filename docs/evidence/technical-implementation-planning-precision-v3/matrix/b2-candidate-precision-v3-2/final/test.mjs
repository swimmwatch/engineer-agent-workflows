import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
import { runCli } from './test-process.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

for (let seconds = 1; seconds <= 60; seconds++) {
  for (const raw of [String(seconds), String(seconds).padStart(4, '0')]) {
    test(`parseTimeout accepts ${raw}`, () => {
      assert.equal(parseTimeout(raw), seconds * 1000);
    });
  }
}

const invalidInputs = [
  '0', '00', '61', '0061', '9'.repeat(400), '1.5', '+1', '-1',
  ' 1', '1 ', '\t1', '1\n', '', 'abc', '1e1', '١', '１',
];

for (const raw of invalidInputs) {
  test(`parseTimeout rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
}

for (const [raw, expected] of [
  [undefined, 5000], ['1', 1000], ['10', 10000], ['11', 11000],
  ['60', 60000], ['0060', 60000],
]) {
  test(`CLI accepts ${JSON.stringify(raw)}`, () => {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, JSON.stringify({ timeoutMs: expected, format: 'json' }) + '\n');
  });
}

for (const raw of invalidInputs) {
  test(`CLI rejects ${JSON.stringify(raw)}`, () => {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.status, 2);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'INVALID_TIMEOUT\n');
  });
}
