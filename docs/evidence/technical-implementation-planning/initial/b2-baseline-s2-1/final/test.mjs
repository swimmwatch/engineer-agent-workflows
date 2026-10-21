import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
import { runCli } from './test-process.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

for (let seconds = 1; seconds <= 60; seconds++) {
  test(`parser accepts ${seconds} seconds`, () => {
    assert.equal(parseTimeout(String(seconds)), seconds * 1000);
  });
}

for (const [raw, timeoutMs] of [['01', 1000], ['0011', 11000], ['060', 60000]]) {
  test(`parser accepts leading zeroes ${raw}`, () => {
    assert.equal(parseTimeout(raw), timeoutMs);
  });
}

for (const [raw, timeoutMs] of [[undefined, 5000], ['5', 5000], ['1', 1000], ['10', 10000], ['11', 11000], ['60', 60000], ['060', 60000]]) {
  test(`CLI success for ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 0, signal: null,
      stdout: JSON.stringify({ timeoutMs, format: 'json' }) + '\n', stderr: '',
    });
  });
}

for (const raw of ['0', '00', '61', '061', '999999999999999999999999', '1.5', '+1', '-1', ' 1', '1 ', '1\n', '', 'abc', '1e1', '１']) {
  test(`parser rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
  test(`CLI rejects ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 2, signal: null, stdout: '', stderr: 'INVALID_TIMEOUT\n',
    });
  });
}
