import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});
import { runCli } from './test-process.mjs';

for (let seconds = 1; seconds <= 60; seconds++) {
  for (const raw of [String(seconds), `0${seconds}`]) {
    test(`parser accepts ${raw}`, () => {
      assert.equal(parseTimeout(raw), seconds * 1000);
    });
  }
}
test('parser accepts multiple leading zeroes', () => {
  assert.equal(parseTimeout('00060'), 60000);
});

for (const raw of [undefined, '5', '11', '60', '060']) {
  test(`CLI success for ${String(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 0,
      signal: null,
      stdout: JSON.stringify({ timeoutMs: raw === undefined ? 5000 : Number(raw) * 1000, format: 'json' }) + '\n',
      stderr: '',
    });
  });
}

const invalid = [
  '0', '000', '61', '061', '999999999999999999999999', '1.5',
  '+1', '-1', ' 1', '1 ', '\t1', '1\n', '', 'abc', '1e1', '１',
];
for (const raw of invalid) {
  test(`parser rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
  test(`CLI rejects ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 2,
      signal: null,
      stdout: '',
      stderr: 'INVALID_TIMEOUT\n',
    });
  });
}
