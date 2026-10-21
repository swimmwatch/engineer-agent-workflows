import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
import { runCli } from './test-process.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

test('undefined timeout defaults to 5000 milliseconds', () => {
  assert.equal(parseTimeout(undefined), 5000);
});

for (let seconds = 1; seconds <= 60; seconds++) {
  for (const raw of [String(seconds), String(seconds).padStart(4, '0')]) {
    test(`parser accepts ${raw}`, () => {
      assert.equal(parseTimeout(raw), seconds * 1000);
    });
  }
}

const invalidInputs = [
  '0', '00', '61', '061', '999', '9'.repeat(400),
  '1.5', '+1', '-1', ' 1', '1 ', '', 'abc', '1e1', '0x10', '١', '１',
];

for (const raw of invalidInputs) {
  const label = raw.length > 40 ? '400-digit value' : JSON.stringify(raw);
  test(`parser rejects ${label}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
  test(`CLI rejects ${label}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      stdout: '', stderr: 'INVALID_TIMEOUT\n', status: 2, signal: null,
    });
  });
}

for (const [raw, timeoutMs] of [
  [undefined, 5000], ['1', 1000], ['10', 10000], ['11', 11000],
  ['60', 60000], ['01', 1000], ['0011', 11000], ['060', 60000],
]) {
  test(`CLI accepts ${raw === undefined ? 'unset timeout' : raw}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      stdout: `{"timeoutMs":${timeoutMs},"format":"json"}\n`,
      stderr: '', status: 0, signal: null,
    });
  });
}
