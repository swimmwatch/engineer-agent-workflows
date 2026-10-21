import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

import { runCli } from './test-process.mjs';

test('timeout default remains 5000 milliseconds', () => {
  assert.equal(parseTimeout(undefined), 5000);
  assert.equal(parseTimeout('5'), 5000);
});

for (let seconds = 1; seconds <= 60; seconds++) {
  for (const raw of [String(seconds), `000${seconds}`]) {
    test(`timeout parser accepts ${raw}`, () => {
      assert.equal(parseTimeout(raw), seconds * 1000);
    });
  }
}

for (const [raw, timeoutMs] of [[undefined, 5000], ['5', 5000], ['11', 11000], ['60', 60000], ['00060', 60000]]) {
  test(`timeout CLI accepts ${JSON.stringify(raw)}`, () => {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, `{"timeoutMs":${timeoutMs},"format":"json"}\n`);
    assert.equal(result.stderr, '');
  });
}

const invalidTimeouts = ['0', '000', '61', '00061', '999999999999999999999999',
  '1.5', '+1', '-1', ' 1', '1 ', '\t1', '1\n', '', 'abc', '1x', '１'];
for (const raw of invalidTimeouts) {
  test(`timeout parser rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
  test(`timeout CLI rejects ${JSON.stringify(raw)}`, () => {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.status, 2);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'INVALID_TIMEOUT\n');
  });
}
