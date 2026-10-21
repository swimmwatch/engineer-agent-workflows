import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

import { runCli } from './test-process.mjs';

for (let seconds = 1; seconds <= 60; seconds++) {
  test(`accepts ${seconds} seconds`, () => {
    assert.equal(parseTimeout(String(seconds)), seconds * 1000);
  });
}
for (const [raw, milliseconds] of [['01', 1000], ['00011', 11000], ['00060', 60000]]) {
  test(`accepts leading zeroes ${raw}`, () => {
    assert.equal(parseTimeout(raw), milliseconds);
  });
}

for (const [raw, milliseconds] of [[undefined, 5000], ['1', 1000], ['10', 10000], ['11', 11000], ['60', 60000], ['00060', 60000]]) {
  test(`CLI accepts ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 0, signal: null,
      stdout: `{"timeoutMs":${milliseconds},"format":"json"}\n`, stderr: '',
    });
  });
}

const invalidValues = [
  '0', '000', '61', '00061', '999999999999999999999',
  '1.5', '60.0', '+1', '-1', ' 1', '1 ', '\t1', '1\n',
  '', 'abc', '1e1', '0x10', '１２',
];
for (const raw of invalidValues) {
  test(`rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
  test(`CLI rejects ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 2, signal: null, stdout: '', stderr: 'INVALID_TIMEOUT\n',
    });
  });
}
