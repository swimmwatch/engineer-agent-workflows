import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.signal,null); assert.equal(r.stderr,''); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); });

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function validateFile(bytes, command = 'validate') {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync(join('.tmp', 'input-'));
  try {
    const file = join(folder, 'records');
    writeFileSync(file, bytes);
    return runCli([command, file], { env: {} });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const validCases = [
  ['empty', '', []],
  ['zero', 'a,0', [{ id: 'a', amount: 0 }]],
  ['ordered with final LF', 'A_-9,0007\nb,9007199254740991\n',
    [{ id: 'A_-9', amount: 7 }, { id: 'b', amount: Number.MAX_SAFE_INTEGER }]],
  ['ordered without final LF', 'A_-9,0007\nb,9007199254740991',
    [{ id: 'A_-9', amount: 7 }, { id: 'b', amount: Number.MAX_SAFE_INTEGER }]],
];
for (const [label, input, records] of validCases) {
  test(`validate accepts ${label}`, () => {
    assert.deepEqual(validateFile(input), {
      status: 0, signal: null, stdout: JSON.stringify(records) + '\n', stderr: '',
    });
  });
}

const invalidCases = [
  ['missing comma', 'b'], ['extra comma', 'b,1,2'],
  ['empty ID', ',1'], ['empty amount', 'b,'],
  ['ID space', 'b c,1'], ['amount space', 'b, 1'],
  ['CRLF', 'b,1\r\n'], ['interior blank row', '\nb,1'],
  ['two trailing LFs', 'b,1\n\n'], ['negative', 'b,-1'],
  ['plus', 'b,+1'], ['decimal', 'b,1.0'], ['exponent', 'b,1e2'],
  ['non-ASCII digits', 'b,١'], ['unsafe integer', 'b,9007199254740992'],
  ['duplicate ID', 'a,2'], ['illegal punctuation', 'b!,1'],
  ['invalid UTF-8', Buffer.from([0x62, 0x2c, 0xff])],
];
for (const [label, finalRow] of invalidCases) {
  test(`validate rejects ${label} without partial output`, () => {
    const input = Buffer.concat([Buffer.from('a,1\n'), Buffer.from(finalRow)]);
    assert.deepEqual(validateFile(input), {
      status: 2, signal: null, stdout: '', stderr: 'INVALID_INPUT\n',
    });
  });
}
test('validate rejects BOM before a row', () => {
  assert.deepEqual(validateFile('\uFEFFa,1'), {
    status: 2, signal: null, stdout: '', stderr: 'INVALID_INPUT\n',
  });
});
test('validate uniqueness is independent across invocations', () => {
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(validateFile('a,1'), {
      status: 0, signal: null, stdout: '[{"id":"a","amount":1}]\n', stderr: '',
    });
  }
});
test('unknown command remains stable', () => {
  assert.deepEqual(runCli(['unknown']), {
    status: 2, signal: null, stdout: '', stderr: 'UNKNOWN_COMMAND\n',
  });
});

const summaryCases = [
  ['empty', '', { count: 0, total: 0 }],
  ['zero', 'a,0', { count: 1, total: 0 }],
  ['final LF', 'a,0007\nb,5\nc,0\n', { count: 3, total: 12 }],
  ['no final LF', 'a,0007\nb,5\nc,0', { count: 3, total: 12 }],
  ['maximum safe amount', 'a,9007199254740991', { count: 1, total: 9007199254740991 }],
  ['safe amounts with larger aggregate', 'a,9007199254740991\nb,1',
    { count: 2, total: 9007199254740992 }],
];
for (const [label, input, summary] of summaryCases) {
  test(`summarize accepts ${label}`, () => {
    assert.deepEqual(validateFile(input, 'summarize'), {
      status: 0, signal: null, stdout: JSON.stringify(summary) + '\n', stderr: '',
    });
  });
}
for (const [label, finalRow] of invalidCases) {
  test(`summarize rejects ${label} without partial output`, () => {
    const input = Buffer.concat([Buffer.from('a,1\n'), Buffer.from(finalRow)]);
    assert.deepEqual(validateFile(input, 'summarize'), {
      status: 2, signal: null, stdout: '', stderr: 'INVALID_INPUT\n',
    });
  });
}
test('summarize rejects BOM before a row', () => {
  assert.deepEqual(validateFile('\uFEFFa,1', 'summarize'), {
    status: 2, signal: null, stdout: '', stderr: 'INVALID_INPUT\n',
  });
});
test('summarize uniqueness is independent across invocations', () => {
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(validateFile('a,1', 'summarize'), {
      status: 0, signal: null, stdout: '{"count":1,"total":1}\n', stderr: '',
    });
  }
});
