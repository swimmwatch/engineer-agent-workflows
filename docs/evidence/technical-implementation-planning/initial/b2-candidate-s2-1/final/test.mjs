import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeout } from './configuration.mjs';
import { runCli } from './test-process.mjs';

test('existing default and accepted value remain stable', () => {
  assert.equal(parseTimeout(undefined), 5000);
  assert.equal(parseTimeout('5'), 5000);
  assert.throws(() => parseTimeout('0'), { name: 'Error', message: 'INVALID_TIMEOUT' });
});

test('CLI with TIMEOUT_SECONDS unset uses the default', () => {
  const result = runCli([], { env: { TIMEOUT_SECONDS: undefined } });
  assert.equal(result.stdout, '{"timeoutMs":5000,"format":"json"}\n');
  assert.equal(result.stderr, '');
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
});

for (const seconds of [11, 60]) {
  test(`parser accepts newly allowed ${seconds} seconds and leading zeroes`, () => {
    for (const raw of [String(seconds), String(seconds).padStart(4, '0')]) {
      assert.equal(parseTimeout(raw), seconds * 1000, raw);
    }
  });
  test(`CLI accepts newly allowed ${seconds} seconds and leading zeroes`, () => {
    for (const raw of [String(seconds), String(seconds).padStart(4, '0')]) {
      const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
      assert.equal(result.stdout, `{"timeoutMs":${seconds * 1000},"format":"json"}\n`, raw);
      assert.equal(result.stderr, '', raw);
      assert.equal(result.status, 0, raw);
      assert.equal(result.signal, null, raw);
    }
  });
}

test('parser and CLI accept every integer 1..60 and zero-padded equivalents', () => {
  for (let seconds = 1; seconds <= 60; seconds++) {
    for (const raw of [String(seconds), String(seconds).padStart(4, '0')]) {
      assert.equal(parseTimeout(raw), seconds * 1000, raw);
      const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
      assert.equal(result.stdout, `{"timeoutMs":${seconds * 1000},"format":"json"}\n`, raw);
      assert.equal(result.stderr, '', raw);
      assert.equal(result.status, 0, raw);
      assert.equal(result.signal, null, raw);
    }
  }
});

const invalidValues = [
  '0', '00', '61', '0061', '9'.repeat(400), '1.5', '+1', '-1',
  ' 1', '1 ', '\t1', '1\t', '\n1', '1\n', '', 'abc', '1x', '١', '１',
];

test('parser rejects invalid input with the exact error', () => {
  for (const raw of invalidValues) {
    assert.throws(() => parseTimeout(raw), { name: 'Error', message: 'INVALID_TIMEOUT' }, JSON.stringify(raw));
  }
});

test('invalid CLI input has empty stdout and exact stderr, exit status and signal', () => {
  for (const raw of invalidValues) {
    const result = runCli([], { env: { TIMEOUT_SECONDS: raw } });
    assert.equal(result.stdout, '', JSON.stringify(raw));
    assert.equal(result.stderr, 'INVALID_TIMEOUT\n', JSON.stringify(raw));
    assert.equal(result.status, 2, JSON.stringify(raw));
    assert.equal(result.signal, null, JSON.stringify(raw));
  }
});
