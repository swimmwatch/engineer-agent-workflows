import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); });

const valid = [
  ['ordered with final LF', 'A_-,0007\nb2,0\n', [{ id: 'A_-', amount: 7 }, { id: 'b2', amount: 0 }]],
  ['ordered without final LF', 'A_-,0007\nb2,0', [{ id: 'A_-', amount: 7 }, { id: 'b2', amount: 0 }]],
  ['empty', '', []],
  ['safe limit', 'max,9007199254740991', [{ id: 'max', amount: Number.MAX_SAFE_INTEGER }]],
  ['exact IDs', 'A,1\na,2\n__proto__,3\nconstructor,4', [
    { id: 'A', amount: 1 }, { id: 'a', amount: 2 },
    { id: '__proto__', amount: 3 }, { id: 'constructor', amount: 4 },
  ]],
];
const invalid = [
  ['missing comma', 'A1'], ['extra comma', 'A,1,2'],
  ['empty ID', ',1'], ['empty amount', 'A,'],
  ['space', ' A,1'], ['tab', 'A,\t1'], ['trailing space', 'A,1 '],
  ['non-ASCII ID', 'é,1'], ['non-ASCII digits', 'A,١'],
  ...['-1', '+1', '1.0', '1e2', 'NaN', 'Infinity'].map(value => [value, `A,${value}`]),
  ['unsafe', 'A,9007199254740992'], ['LF only', '\n'],
  ['CRLF', 'A,1\r\n'], ['interior blank', 'A,1\n\nB,2'],
  ['two final LFs', 'A,1\n\n'], ['invalid UTF-8', Buffer.from([0xc3, 0x28])],
  ['BOM', '\uFEFFA,1'], ['late malformed', 'A,1\nbad'],
  ['late duplicate', 'A,1\nA,2'], ['late unsafe', 'A,1\nB,9007199254740992'],
];
const invalidResult = { status: 2, signal: null, stdout: '', stderr: 'INVALID_INPUT\n' };

function withFile(bytes, check) {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync(join('.tmp', 'records-'));
  try {
    const path = join(folder, 'input');
    writeFileSync(path, bytes);
    check(path);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

for (const [name, bytes, records] of valid) {
  test(`validate: CLI accepts ${name}`, () => withFile(bytes, path => {
    assert.deepEqual(runCli(['validate', path], { env: {} }), {
      status: 0, signal: null, stdout: JSON.stringify(records) + '\n', stderr: '',
    });
  }));
  test(`validate: parser accepts ${name}`, async () => {
    const { parseRecords } = await import('./records.mjs');
    assert.deepEqual(parseRecords(Buffer.from(bytes)), records);
  });
}
for (const [name, bytes] of invalid) {
  test(`validate: CLI rejects ${name}`, () => withFile(bytes, path => {
    assert.deepEqual(runCli(['validate', path], { env: {} }), invalidResult);
  }));
  test(`validate: parser rejects ${name}`, async () => {
    const { parseRecords } = await import('./records.mjs');
    assert.throws(() => parseRecords(Buffer.from(bytes)));
  });
}
test('validate: parser uniqueness state is per call', async () => {
  const { parseRecords } = await import('./records.mjs');
  const first = parseRecords(Buffer.from('A,1'));
  first[0].amount = 9;
  assert.deepEqual(parseRecords(Buffer.from('A,1')), [{ id: 'A', amount: 1 }]);
});
test('validate: missing operand', () => {
  assert.deepEqual(runCli(['validate'], { env: {} }), invalidResult);
});
test('validate: nonexistent file', () => {
  withFile('', path => {
    assert.deepEqual(runCli(['validate', path + '-absent'], { env: {} }), invalidResult);
  });
});
test('compat: exact help', () => {
  assert.deepEqual(runCli(['help'], { env: {} }), {
    status: 0, signal: null,
    stdout: 'record-report: validate <file> | summarize <file>\n', stderr: '',
  });
});
for (const args of [['unknown'], []]) {
  test(`compat: unknown command ${JSON.stringify(args)}`, () => {
    assert.deepEqual(runCli(args, { env: {} }), {
      status: 2, signal: null, stdout: '', stderr: 'UNKNOWN_COMMAND\n',
    });
  });
}

const summaries = [
  ...valid.map(([name, bytes, records]) => [name, bytes,
    JSON.stringify({ count: records.length, total: records.reduce((sum, record) => sum + record.amount, 0) }) + '\n']),
  ['aggregate with final LF', 'a,2\nb,7\nc,0\n', '{"count":3,"total":9}\n'],
  ['aggregate without final LF', 'a,2\nb,7\nc,0', '{"count":3,"total":9}\n'],
  ['exact large total', 'a,9007199254740991\nb,9007199254740991\nc,9007199254740991\n',
    '{"count":3,"total":27021597764222973}\n'],
];
for (const [name, bytes, stdout] of summaries) {
  test(`summarize: CLI accepts ${name}`, () => withFile(bytes, path => {
    assert.deepEqual(runCli(['summarize', path], { env: {} }), {
      status: 0, signal: null, stdout, stderr: '',
    });
  }));
}
for (const [name, bytes] of invalid) {
  test(`summarize: CLI rejects ${name}`, () => withFile(bytes, path => {
    assert.deepEqual(runCli(['summarize', path], { env: {} }), invalidResult);
  }));
}
test('summarize: missing operand', () => {
  assert.deepEqual(runCli(['summarize'], { env: {} }), invalidResult);
});
test('summarize: nonexistent file', () => withFile('', path => {
  assert.deepEqual(runCli(['summarize', path + '-absent'], { env: {} }), invalidResult);
}));
