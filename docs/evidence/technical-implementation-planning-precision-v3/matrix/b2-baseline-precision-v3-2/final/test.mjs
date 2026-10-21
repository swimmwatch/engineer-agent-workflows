import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
import { runCli } from './test-process.mjs';
test('existing default and accepted value remain stable',()=>{assert.equal(parseTimeout(undefined),5000);assert.equal(parseTimeout('5'),5000);assert.throws(()=>parseTimeout('0'),/INVALID_TIMEOUT/);});

for (let seconds = 1; seconds <= 60; seconds++) {
  test(`accepts ${seconds} seconds`, () => {
    assert.equal(parseTimeout(String(seconds)), seconds * 1000);
  });
}

for (const [raw, expected] of [['0001', 1000], ['0011', 11000], ['00060', 60000]]) {
  test(`accepts leading zeroes in ${raw}`, () => {
    assert.equal(parseTimeout(raw), expected);
  });
}

test('CLI preserves the default when TIMEOUT_SECONDS is absent', () => {
  const hadTimeout = Object.hasOwn(process.env, 'TIMEOUT_SECONDS');
  const original = process.env.TIMEOUT_SECONDS;
  try {
    delete process.env.TIMEOUT_SECONDS;
    assert.deepEqual(runCli([]), {
      status: 0, signal: null,
      stdout: '{"timeoutMs":5000,"format":"json"}\n', stderr: '',
    });
  } finally {
    if (hadTimeout) process.env.TIMEOUT_SECONDS = original;
    else delete process.env.TIMEOUT_SECONDS;
  }
});

for (const [raw, expected] of [['11', 11000], ['60', 60000], ['00060', 60000]]) {
  test(`CLI accepts ${raw} seconds`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 0, signal: null,
      stdout: `{"timeoutMs":${expected},"format":"json"}\n`, stderr: '',
    });
  });
}

const invalidTimeouts = [
  '0', '000', '61', '00061', '999999999999999999999999',
  '1.5', '+1', '-1', ' 1', '1 ', '1\n', '', 'abc', '1e1', '0x10', '١', '１',
];

for (const raw of invalidTimeouts) {
  test(`rejects ${JSON.stringify(raw)}`, () => {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' });
  });
  test(`CLI rejects ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(runCli([], { env: { TIMEOUT_SECONDS: raw } }), {
      status: 2, signal: null, stdout: '', stderr: 'INVALID_TIMEOUT\n',
    });
  });
}
