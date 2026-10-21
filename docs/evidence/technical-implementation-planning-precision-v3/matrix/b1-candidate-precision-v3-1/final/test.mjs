import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); assert.equal(r.stderr,''); assert.equal(r.signal,null); });

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function assertResult(result, status, stdout, stderr) {
  assert.equal(result.status, status);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, stdout);
  assert.equal(result.stderr, stderr);
}

function validateInput(input, command = 'validate') {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync('.tmp/records-');
  try {
    const file = join(folder, 'input');
    writeFileSync(file, input);
    return runCli([command, file], { env: {} });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const validRows = 'a,0\nZ_9-,007\nx,9007199254740991';
const records = [
  { id: 'a', amount: 0 },
  { id: 'Z_9-', amount: 7 },
  { id: 'x', amount: 9007199254740991 },
];
for (const [name, input, expected] of [
  ['empty', '', []],
  ['without final LF', validRows, records],
  ['with final LF', validRows + '\n', records],
  ['repeat invocation', validRows, records],
]) {
  test(`validate ${name}`, () => {
    assertResult(validateInput(input), 0, JSON.stringify(expected) + '\n', '');
  });
}

const invalidInputs = [
  ['invalid ID', 'a!,1'], ['empty ID', ',1'],
  ['missing column', 'a'], ['missing amount', 'a,'],
  ['negative', 'a,-1'], ['plus', 'a,+1'], ['fraction', 'a,1.5'],
  ['exponent', 'a,1e2'], ['Unicode digit', 'a,１'],
  ['unsafe amount', 'a,9007199254740992'], ['extra comma', 'a,1,2'],
  ['ID whitespace', ' a,1'], ['amount whitespace', 'a,1 '],
  ['CRLF', 'a,1\r\n'], ['interior blank', 'a,1\n\nb,2'],
  ['second terminal LF', 'a,1\n\n'], ['lone LF', '\n'],
  ['duplicate', 'a,1\na,2'], ['nonadjacent duplicate', 'a,1\nb,2\na,3'],
  ['BOM', '\ufeffa,1'], ['late invalid row', 'a,1\nb,2\nbad,-1'],
];
for (const [name, input] of [
  ...invalidInputs,
  ['malformed UTF-8', Buffer.from([0x61, 0x2c, 0x31, 0x0a, 0xc3, 0x28])],
]) {
  for (const command of ['validate', 'summarize']) {
    test(`${command} rejects ${name} without output`, () => {
      assertResult(validateInput(input, command), 2, '', 'INVALID_INPUT\n');
    });
  }
}

test('unknown command remains stable', () => {
  assertResult(runCli(['unknown'], { env: {} }), 2, '', 'UNKNOWN_COMMAND\n');
});

test('pure parser returns ordered numeric records with independent call state', async () => {
  const { parseRecords } = await import('./records.mjs');
  assert.deepEqual(parseRecords(''), []);
  const first = parseRecords(validRows);
  assert.deepEqual(first, records);
  first[0].amount = 99;
  assert.deepEqual(parseRecords(validRows + '\n'), records);
  for (const [, input] of invalidInputs) assert.throws(() => parseRecords(input));
  assert.deepEqual(parseRecords(validRows), records);
});

for (const [name, input, expected] of [
  ['empty', '', '{"count":0,"total":0}\n'],
  ['ordinary with LF', 'a,2\nb,003\n', '{"count":2,"total":5}\n'],
  ['ordinary without LF', 'a,2\nb,003', '{"count":2,"total":5}\n'],
  ['zeros', 'a,0\nb,000', '{"count":2,"total":0}\n'],
  ['single row', 'a,007', '{"count":1,"total":7}\n'],
  ['above safe integer', 'a,9007199254740991\nb,2\n', '{"count":2,"total":9007199254740993}\n'],
  ['three maximum amounts', 'a,9007199254740991\nb,9007199254740991\nc,9007199254740991', '{"count":3,"total":27021597764222973}\n'],
]) {
  test(`summarize ${name}`, () => {
    assertResult(validateInput(input, 'summarize'), 0, expected, '');
  });
}

test('pure summary uses exact per-call totals without mutation', async () => {
  const { parseRecords, summarizeRecords } = await import('./records.mjs');
  assert.deepEqual(summarizeRecords([]), { count: 0, total: 0n });
  const input = parseRecords('a,9007199254740991\nb,2');
  const before = structuredClone(input);
  for (const record of input) Object.freeze(record);
  Object.freeze(input);
  assert.deepEqual(summarizeRecords(input), { count: 2, total: 9007199254740993n });
  assert.deepEqual(input, before);
  assert.deepEqual(summarizeRecords(parseRecords('x,003')), { count: 1, total: 3n });
  assert.deepEqual(summarizeRecords([]), { count: 0, total: 0n });
});
