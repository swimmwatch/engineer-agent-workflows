import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); });
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function withInput(bytes, check) {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync(join('.tmp', 'p01-'));
  const file = join(folder, 'records');
  try {
    writeFileSync(file, bytes);
    check(file);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

function assertResult(result, status, stdout, stderr) {
  assert.equal(result.status, status);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, stdout);
  assert.equal(result.stderr, stderr);
}

for (const [name, input, output] of [
  ['ordered rows', 'a,0\nZ_9-,0007', '[{"id":"a","amount":0},{"id":"Z_9-","amount":7}]\n'],
  ['one final LF', 'a,0\nZ_9-,0007\n', '[{"id":"a","amount":0},{"id":"Z_9-","amount":7}]\n'],
  ['safe maximum', 'a,9007199254740991', '[{"id":"a","amount":9007199254740991}]\n'],
  ['case-sensitive IDs', 'a,1\nA,2', '[{"id":"a","amount":1},{"id":"A","amount":2}]\n'],
  ['empty input', '', '[]\n'],
]) {
  test(`P01 valid ${name}`, () => withInput(input, file => {
    assertResult(runCli(['validate', file]), 0, output, '');
  }));
}

const invalidInputs = [
  ['LF alone', '\n'], ['interior blank', 'a,1\n\nb,2'],
  ['two final LFs', 'a,1\n\n'], ['CRLF', 'a,1\r\n'],
  ['missing comma', 'a1'], ['extra comma', 'a,1,2'],
  ['empty ID', ',1'], ['empty amount', 'a,'],
  ['ID space', 'a b,1'], ['leading space', ' a,1'],
  ['punctuation ID', 'a.,1'], ['non-ASCII ID', 'é,1'],
  ['BOM', '\uFEFFa,1'],
  ...['-1', '+1', '1.0', '1e2', ' 1', '1 ', '\t1', '١',
    '9007199254740992', '9'.repeat(1000)].map(value => [`amount ${value.slice(0, 20)}`, `a,${value}`]),
  ['duplicate IDs', 'a,1\na,2'],
  ['atomic invalid final row', 'a,1\nb,bad'],
  ['atomic invalid UTF-8', Buffer.concat([Buffer.from('a,1\nb,'), Buffer.from([0xff])])],
];
for (const [name, input] of invalidInputs) {
  test(`P01 rejects ${name}`, () => withInput(input, file => {
    assertResult(runCli(['validate', file]), 2, '', 'INVALID_INPUT\n');
  }));
}

test('P01 missing path', () => {
  assertResult(runCli(['validate']), 2, '', 'INVALID_INPUT\n');
});
test('P01 nonexistent file', () => withInput('', file => {
  assertResult(runCli(['validate', `${file}.missing`]), 2, '', 'INVALID_INPUT\n');
}));
test('P01 help compatibility', () => {
  assertResult(runCli(['help']), 0, 'record-report: validate <file> | summarize <file>\n', '');
});
for (const args of [[], ['unknown']]) {
  test(`P01 unknown command ${JSON.stringify(args)}`, () => {
    assertResult(runCli(args), 2, '', 'UNKNOWN_COMMAND\n');
  });
}

for (const [name, input, output] of [
  ['ordinary rows', 'a,2\nb,0003', '{"count":2,"total":5}\n'],
  ['one final LF', 'a,2\nb,0003\n', '{"count":2,"total":5}\n'],
  ['zero amount', 'a,0', '{"count":1,"total":0}\n'],
  ['empty input', '', '{"count":0,"total":0}\n'],
  ['exact large total', 'a,9007199254740991\nb,2', '{"count":2,"total":9007199254740993}\n'],
]) {
  test(`P02 summary ${name}`, () => withInput(input, file => {
    assertResult(runCli(['summarize', file]), 0, output, '');
  }));
}

for (const [name, input] of invalidInputs) {
  test(`P02 rejects ${name}`, () => withInput(input, file => {
    for (const command of ['validate', 'summarize']) {
      assertResult(runCli([command, file]), 2, '', 'INVALID_INPUT\n');
    }
  }));
}
test('P02 missing path', () => {
  for (const command of ['validate', 'summarize']) {
    assertResult(runCli([command]), 2, '', 'INVALID_INPUT\n');
  }
});
test('P02 nonexistent file', () => withInput('', file => {
  for (const command of ['validate', 'summarize']) {
    assertResult(runCli([command, `${file}.missing`]), 2, '', 'INVALID_INPUT\n');
  }
}));
