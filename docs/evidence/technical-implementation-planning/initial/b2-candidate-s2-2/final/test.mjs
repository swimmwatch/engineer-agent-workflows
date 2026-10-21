import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
import { runCli } from './test-process.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

for (const raw of ['10', '11', '59', '60', '00060']) {
  test(`parser accepts boundary ${raw}`, () => {
    assert.equal(parseTimeout(raw), Number(raw) * 1000);
  });
}

test('parser accepts every second from 1 through 60, including leading zeroes', () => {
  for (let seconds = 1; seconds <= 60; seconds++) {
    assert.equal(parseTimeout(String(seconds)), seconds * 1000);
    assert.equal(parseTimeout(`000${seconds}`), seconds * 1000);
  }
});

const invalidInputs = [
  '0', '000', '61', '00061', '999999999999999999999999999999999999',
  '1.5', '+1', '-1', ' 1', '1 ', '1\n', '', 'abc', '1e1', '0x10', '١', '１',
];

test('parser rejects invalid ranges and lexical forms with the exact error', () => {
  for (const raw of invalidInputs) {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' }, JSON.stringify(raw));
  }
});

for (const [raw, timeoutMs] of [[undefined, 5000], ['60', 60000], ['00060', 60000]]) {
  test(`CLI success for ${raw === undefined ? 'unset TIMEOUT_SECONDS' : raw}`, () => {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, `{"timeoutMs":${timeoutMs},"format":"json"}\n`);
    assert.equal(result.stderr, '');
  });
}

for (const raw of invalidInputs) {
  test(`CLI rejects ${JSON.stringify(raw)} with empty stdout and the exact error`, () => {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.status, 2);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'INVALID_TIMEOUT\n');
  });
}
