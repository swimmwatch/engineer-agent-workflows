import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); });

function expectResult(args, status, stdout, stderr) {
  const r = runCli(args);
  assert.equal(r.signal, null);
  assert.equal(r.status, status);
  assert.equal(r.stdout, stdout);
  assert.equal(r.stderr, stderr);
}

function withFixture(bytes, check) {
  const root = fileURLToPath(new URL('./.tmp/', import.meta.url));
  mkdirSync(root, { recursive: true });
  const folder = mkdtempSync(join(root, 'packet01-'));
  try {
    const path = join(folder, 'records');
    if (bytes !== null) writeFileSync(path, bytes);
    check(path);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const validCases = [
  ['valid final LF', 'a,0\nB_2-,0002\n', '[{"id":"a","amount":0},{"id":"B_2-","amount":2}]\n'],
  ['valid no final LF', 'a,0\nB_2-,0002', '[{"id":"a","amount":0},{"id":"B_2-","amount":2}]\n'],
  ['empty', '', '[]\n'],
  ['safe boundary', 'a,9007199254740991', '[{"id":"a","amount":9007199254740991}]\n'],
];
for (const [name, input, output] of validCases) {
  test(`packet01 ${name}`, () => withFixture(input, path =>
    expectResult(['validate', path], 0, output, '')));
}

const invalidCases = [
  ['unsafe boundary', 'a,9007199254740992'],
  ['empty ID', ',1'], ['empty amount', 'a,'],
  ['punctuation ID', 'a!,1'], ['Unicode ID', 'é,1'],
  ['missing comma', 'a1'], ['extra comma', 'a,1,2'],
  ['leading ID space', ' a,1'], ['trailing ID space', 'a ,1'],
  ['leading amount space', 'a, 1'], ['trailing amount space', 'a,1 '],
  ['negative', 'a,-1'], ['plus', 'a,+1'], ['decimal', 'a,1.0'],
  ['exponent', 'a,1e2'], ['Unicode digits', 'a,١'],
  ['duplicate', 'a,1\na,2'], ['CRLF', 'a,1\r\n'],
  ['interior blank', 'a,1\n\nb,2'], ['two final LF', 'a,1\n\n'],
  ['only LF', '\n'], ['invalid UTF-8', Buffer.from([0x61, 0x2c, 0xc3, 0x28])],
  ['BOM', '\uFEFFa,1'],
  ['atomic duplicate', 'ok,1\nbad,2\nok,3'],
  ['atomic invalid', 'ok,1\nbad,-1'],
  ['read failure', null],
];
for (const [name, input] of invalidCases) {
  test(`packet01 rejects ${name}`, () => withFixture(input, path =>
    expectResult(['validate', path], 2, '', 'INVALID_INPUT\n')));
}

test('packet01 compatibility', () => {
  expectResult(['help'], 0, 'record-report: validate <file> | summarize <file>\n', '');
  expectResult(['unknown'], 2, '', 'UNKNOWN_COMMAND\n');
});

// Reuse packet 01's byte corpus for both commands; expected summary tokens
// are text so JSON.parse/Number cannot hide rounding above the safe bound.
for (const [name, input, output] of validCases) {
  const summary = name === 'empty' ? '{"count":0,"total":0}\n'
    : name === 'safe boundary' ? '{"count":1,"total":9007199254740991}\n'
    : '{"count":2,"total":2}\n';
  test(`packet02 shared ${name}`, () => withFixture(input, path => {
    expectResult(['validate', path], 0, output, '');
    expectResult(['summarize', path], 0, summary, '');
  }));
}
for (const [name, input] of invalidCases) {
  test(`packet02 rejects ${name}`, () => withFixture(input, path => {
    expectResult(['validate', path], 2, '', 'INVALID_INPUT\n');
    expectResult(['summarize', path], 2, '', 'INVALID_INPUT\n');
  }));
}
for (const [name, input, output] of [
  ['ordinary final LF', 'a,0\nb,0002\nc,3\n', '{"count":3,"total":5}\n'],
  ['ordinary no final LF', 'a,0\nb,0002\nc,3', '{"count":3,"total":5}\n'],
  ['exact', 'a,9007199254740991\nb,2\n', '{"count":2,"total":9007199254740993}\n'],
  ['repeat-large', 'a,9007199254740991\nb,9007199254740991\nc,1', '{"count":3,"total":18014398509481983}\n'],
]) {
  test(`packet02 ${name}`, () => withFixture(input, path =>
    expectResult(['summarize', path], 0, output, '')));
}
test('packet02 compatibility', () => {
  expectResult(['help'], 0, 'record-report: validate <file> | summarize <file>\n', '');
  expectResult(['unknown'], 2, '', 'UNKNOWN_COMMAND\n');
});
