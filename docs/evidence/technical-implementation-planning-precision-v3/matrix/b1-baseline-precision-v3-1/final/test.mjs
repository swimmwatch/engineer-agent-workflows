import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); assert.equal(r.signal,null); assert.equal(r.stderr,''); });

function validate(input, command = 'validate') {
  const root = new URL('./.tmp/', import.meta.url);
  mkdirSync(root, { recursive: true });
  const folder = mkdtempSync(join(root.pathname, 'records-'));
  try {
    const file = join(folder, 'input');
    writeFileSync(file, input);
    return runCli([command, file]);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

function expectSuccess(result, stdout) {
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, stdout);
  assert.equal(result.stderr, '');
}

function expectInvalid(result) {
  assert.equal(result.status, 2);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'INVALID_INPUT\n');
}

test('validate emits ordered records with safe numeric amounts', () => {
  expectSuccess(validate('a_1,0\nB-2,0002\nx,9007199254740991\n'),
    '[{"id":"a_1","amount":0},{"id":"B-2","amount":2},{"id":"x","amount":9007199254740991}]\n');
});

test('validate accepts no terminal LF, case-sensitive IDs and repeated invocations', () => {
  for (let i = 0; i < 2; i++) {
    expectSuccess(validate('a,1\nA,2'), '[{"id":"a","amount":1},{"id":"A","amount":2}]\n');
  }
});

test('validate accepts empty bytes', () => {
  expectSuccess(validate(Buffer.alloc(0)), '[]\n');
});

const invalidInputs = [
  ['only LF', '\n'],
  ['blank interior row', 'a,1\n\nb,2'],
  ['two trailing LFs', 'a,1\n\n'],
  ['CRLF', 'a,1\r\n'],
  ['missing comma', 'a1'],
  ['extra comma', 'a,1,2'],
  ['empty ID', ',1'],
  ['empty amount', 'a,'],
  ['ID space', 'a b,1'],
  ['amount space', 'a, 1'],
  ['trailing amount space', 'a,1 '],
  ['non-ASCII ID', 'é,1'],
  ['positive sign', 'a,+1'],
  ['negative sign', 'a,-1'],
  ['fraction', 'a,1.0'],
  ['exponent', 'a,1e2'],
  ['Unicode digits', 'a,١'],
  ['unsafe amount', 'a,9007199254740992'],
  ['duplicate ID', 'a,1\na,2'],
  ['malformed suffix after valid prefix', 'a,1\nb,2\nc,3\nbroken'],
  ['duplicate suffix after valid prefix', 'a,1\nb,2\nc,3\na,4'],
  ['invalid UTF-8', Buffer.from([0xc3, 0x28])],
  ['invalid UTF-8 suffix', Buffer.concat([Buffer.from('a,1\nb,2\n'), Buffer.from([0xff])])],
  ['BOM prefix', '\ufeffa,1'],
];

for (const [name, input] of invalidInputs) {
  test(`validate rejects ${name} without partial output`, () => {
    expectInvalid(validate(input));
  });
  test(`summarize rejects ${name} without partial output`, () => {
    expectInvalid(validate(input, 'summarize'));
  });
}

const summaryInputs = [
  ['empty bytes', Buffer.alloc(0), '{"count":0,"total":0}\n'],
  ['zero and leading zeros', 'a_1,0\nB-2,0002\nx,9007199254740991\n', '{"count":3,"total":9007199254740993}\n'],
  ['case-sensitive IDs', 'a,1\nA,2', '{"count":2,"total":3}\n'],
  ['ordinary rows', 'a,2\nb,003\nc,0', '{"count":3,"total":5}\n'],
  ['ordinary rows with LF', 'a,2\nb,003\nc,0\n', '{"count":3,"total":5}\n'],
  // Safe individual amounts can have an unsafe aggregate: compare raw numeric tokens.
  ['exact total above safe integer', 'a,9007199254740991\nb,2\n', '{"count":2,"total":9007199254740993}\n'],
  ['two maximum amounts', 'a,9007199254740991\nb,9007199254740991\n', '{"count":2,"total":18014398509481982}\n'],
];

for (const [name, input, expected] of summaryInputs) {
  test(`summarize emits ${name}`, () => {
    for (let i = 0; i < 2; i++) {
      expectSuccess(validate(input, 'summarize'), expected);
    }
  });
}

for (const [name, suffix] of [
  ['malformed', 'broken'],
  ['duplicate', 'a,1'],
  ['invalid bytes', Buffer.from([0xff])],
]) {
  for (const command of ['validate', 'summarize']) {
    test(`${command} rejects ${name} suffix after maximum prefix atomically`, () => {
      const input = Buffer.concat([Buffer.from('a,9007199254740991\nb,2\n'), Buffer.from(suffix)]);
      expectInvalid(validate(input, command));
    });
  }
}

test('summarize maps missing and unreadable file paths to bounded errors', () => {
  expectInvalid(runCli(['summarize']));
  expectInvalid(runCli(['summarize', new URL('./.tmp/absent/input', import.meta.url).pathname]));
});

test('validate maps missing and unreadable file paths to bounded errors', () => {
  expectInvalid(runCli(['validate']));
  expectInvalid(runCli(['validate', new URL('./.tmp/absent/input', import.meta.url).pathname]));
});

test('unknown command retains its error contract', () => {
  const result = runCli(['unknown']);
  assert.equal(result.status, 2);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'UNKNOWN_COMMAND\n');
});
