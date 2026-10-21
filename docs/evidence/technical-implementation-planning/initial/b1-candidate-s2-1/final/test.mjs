import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.signal,null); assert.equal(r.stderr,''); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); });

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function validateInput(input) {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync('.tmp/P1-');
  const file = join(folder, 'input records.txt');
  try {
    writeFileSync(file, input);
    return runCli(['validate', file], { env: {} });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
function success(input, stdout) {
  assert.deepEqual(validateInput(input), { status: 0, signal: null, stdout, stderr: '' });
}
function invalid(input) {
  const r = validateInput(input);
  assert.equal(r.stdout, '');
  assert.equal(r.stderr, 'INVALID_INPUT\n');
  assert.equal(r.status, 2);
  assert.equal(r.signal, null);
}

test('P1 unknown command remains stable', () => {
  assert.deepEqual(runCli(['unknown'], { env: {} }), {
    status: 2, signal: null, stdout: '', stderr: 'UNKNOWN_COMMAND\n',
  });
});
test('P1 valid records with optional terminal LF', () => {
  for (const ending of ['', '\n']) {
    success('a,1\nB_-2,002' + ending, '[{"id":"a","amount":1},{"id":"B_-2","amount":2}]\n');
  }
});
test('P1 numeric boundaries', () => {
  success('a,0\nb,9007199254740991', '[{"id":"a","amount":0},{"id":"b","amount":9007199254740991}]\n');
  invalid('a,9007199254740992');
});
test('P1 empty input', () => success('', '[]\n'));
const invalidRows = [
  ['missing comma', 'a1'], ['extra comma', 'a,1,2'],
  ['empty id', ',1'], ['empty amount', 'a,'],
  ['space in id', 'a b,1'], ['dot in id', 'a.b,1'], ['non-ASCII id', 'é,1'],
  ['leading amount space', 'a, 1'], ['trailing amount space', 'a,1 '],
  ['plus sign', 'a,+1'], ['minus sign', 'a,-1'], ['decimal', 'a,1.0'],
  ['exponent', 'a,1e2'], ['non-ASCII digit', 'a,١'],
  ['only LF', '\n'], ['leading blank', '\na,1'],
  ['interior blank', 'a,1\n\nb,2'], ['two terminal LFs', 'a,1\n\n'],
  ['CRLF', 'a,1\r\n'], ['terminal CR', 'a,1\r'],
];
for (const [label, input] of invalidRows) {
  test('P1 invalid grammar: ' + label, () => invalid(input));
}
test('P1 duplicate IDs are case sensitive', () => {
  invalid('a,1\na,2');
  success('a,1\nA,2', '[{"id":"a","amount":1},{"id":"A","amount":2}]\n');
});
test('P1 malformed UTF-8', () => invalid(Buffer.from([0x61, 0x2c, 0xc3, 0x28])));
test('P1 BOM rejected', () => invalid('\uFEFFa,1'));
test('P1 late duplicate has no partial output', () => invalid('a,1\nb,2\na,3'));
test('P1 late malformed row has no partial output', () => invalid('a,1\nb,2\nbad'));
test('P1 parser owns independent arrays', async () => {
  const { parseRecords } = await import('./records.mjs');
  const first = parseRecords('a,1');
  const second = parseRecords('a,1');
  assert.notStrictEqual(first, second);
  first[0].amount = 99;
  first.push({ id: 'b', amount: 2 });
  assert.deepEqual(second, [{ id: 'a', amount: 1 }]);
  assert.deepEqual(parseRecords('a,1'), [{ id: 'a', amount: 1 }]);
});
test('P1 parser recovers after duplicate failure', async () => {
  const { parseRecords } = await import('./records.mjs');
  assert.throws(() => parseRecords('a,1\na,2'));
  assert.deepEqual(parseRecords('a,1'), [{ id: 'a', amount: 1 }]);
});

function summarizeInput(input, command = 'summarize') {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync('.tmp/P2-');
  const file = join(folder, 'input records.txt');
  try {
    writeFileSync(file, input);
    return runCli([command, file], { env: {} });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
function summarySuccess(input, stdout) {
  assert.deepEqual(summarizeInput(input), { status: 0, signal: null, stdout, stderr: '' });
}
function parityInvalid(input) {
  for (const command of ['validate', 'summarize']) {
    const r = summarizeInput(input, command);
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, 'INVALID_INPUT\n');
    assert.equal(r.status, 2);
    assert.equal(r.signal, null);
  }
}
test('P2 count and total with optional terminal LF', () => {
  for (const ending of ['', '\n']) {
    summarySuccess('a,1\nB_-2,002' + ending, '{"count":2,"total":3}\n');
  }
});
test('P2 shared parser validate success', () => {
  success('a,1', '[{"id":"a","amount":1}]\n');
});
test('P2 shared parser summarize success', () => {
  summarySuccess('a,1', '{"count":1,"total":1}\n');
});
test('P2 empty input', () => summarySuccess('', '{"count":0,"total":0}\n'));
test('P2 numeric boundaries and aggregate above safe integer', () => {
  summarySuccess('a,0\nb,002\nc,9007199254740991', '{"count":3,"total":9007199254740992}\n');
  summarySuccess('a,9007199254740991\nb,1', '{"count":2,"total":9007199254740992}\n');
});
test('P2 case sensitive IDs', () => summarySuccess('a,1\nA,2', '{"count":2,"total":3}\n'));
for (const [label, input] of [
  ...invalidRows,
  ['unsafe amount', 'a,9007199254740992'],
  ['duplicate IDs', 'a,1\na,2'],
  ['malformed UTF-8', Buffer.from([0x61, 0x2c, 0xc3, 0x28])],
  ['BOM', '\uFEFFa,1'],
]) {
  test('P2 invalid parity: ' + label, () => parityInvalid(input));
}
test('P2 late invalid row has no partial summary', () => parityInvalid('a,1\nb,2\nbad'));
test('P2 late duplicate has no partial summary', () => parityInvalid('a,1\nb,2\na,3'));
