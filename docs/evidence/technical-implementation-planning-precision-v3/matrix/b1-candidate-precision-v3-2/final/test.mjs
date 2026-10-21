import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './test-process.mjs';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

test('existing help remains stable', () => { const r=runCli(['help']); assert.equal(r.status,0); assert.equal(r.stdout,'record-report: validate <file> | summarize <file>\n'); assert.equal(r.stderr, ''); assert.equal(r.signal, null); });

function expectResult(args, status, stdout, stderr) {
  assert.deepEqual(runCli(args, { env: {} }), { status, signal: null, stdout, stderr });
}

function withInput(bytes, check) {
  mkdirSync('.tmp', { recursive: true });
  const folder = mkdtempSync(join('.tmp', 'input-'));
  try {
    const file = join(folder, 'records');
    writeFileSync(file, bytes);
    check(file);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

for (const args of [[], ['unknown']]) {
  test(`unknown routing ${JSON.stringify(args)}`, () => {
    expectResult(args, 2, '', 'UNKNOWN_COMMAND\n');
  });
}

const ordered = [{ id: 'a', amount: 1 }, { id: 'b-2', amount: 2 }, { id: 'U_3', amount: 9007199254740991 }];
for (const command of ['validate', 'summarize']) {
  for (const ending of ['', '\n']) {
    test(`ordered ${command} with ${ending ? 'terminal LF' : 'no terminal LF'}`, () => {
      withInput(`a,1\nb-2,0002\nU_3,9007199254740991${ending}`, file => {
        expectResult([command, file], 0, command === 'validate' ? JSON.stringify(ordered) + '\n' : '{"count":3,"total":9007199254740994}\n', '');
      });
    });
  }

  test(`empty input ${command}`, () => {
    withInput(Buffer.alloc(0), file => expectResult([command, file], 0, command === 'validate' ? '[]\n' : '{"count":0,"total":0}\n', ''));
  });

  test(`zero, allowed id characters and case-sensitive ids ${command}`, () => {
    const expected = [{ id: 'AZaz09_-', amount: 0 }, { id: 'A', amount: 9007199254740991 }, { id: 'a', amount: 2 }];
    withInput('AZaz09_-,0\nA,9007199254740991\na,0002\n', file => {
      expectResult([command, file], 0, command === 'validate' ? JSON.stringify(expected) + '\n' : '{"count":3,"total":9007199254740993}\n', '');
    });
  });

}

const invalid = [
  ['empty id', ',1'], ['empty amount', 'a,'], ['missing comma', 'a1'],
  ['extra comma', 'a,1,2'], ['negative', 'a,-1'], ['plus', 'a,+1'],
  ['fraction', 'a,1.0'], ['exponent', 'a,1e2'], ['leading space', 'a, 1'],
  ['trailing space', 'a,1 '], ['id whitespace', ' a,1'], ['tab', 'a,1\t'],
  ['Unicode digits', 'a,١'], ['CRLF', 'a,1\r\n'], ['bare CR', 'a,1\r'],
  ['unsafe amount', 'a,9007199254740992'], ['internal blank', 'a,1\n\nb,2'],
  ['two terminal LFs', 'a,1\n\n'], ['LF only', '\n'], ['invalid id', 'a.b,1'],
  ['Unicode id', 'é,1'], ['BOM', '\uFEFFa,1'],
  ['adjacent duplicate', 'a,1\na,2'], ['late duplicate', 'a,1\nb,2\na,3'],
  ['late malformed row', 'a,1\nb,2\nbroken'],
  ['late invalid UTF-8', Buffer.concat([Buffer.from('a,1\nb,2\n'), Buffer.from([0xc3, 0x28])])],
];
for (const command of ['validate', 'summarize']) {
  for (const [name, bytes] of invalid) {
    test(`${command} reject ${name} without partial output`, () => {
      withInput(bytes, file => expectResult([command, file], 2, '', 'INVALID_INPUT\n'));
    });
  }

  test(`${command} missing file argument fails with bounded diagnostic`, () => {
    expectResult([command], 2, '', 'INVALID_INPUT\n');
  });

  for (const kind of ['missing', 'directory']) {
    test(`${command} ${kind} file path fails with bounded diagnostic`, () => {
      mkdirSync('.tmp', { recursive: true });
      const folder = mkdtempSync(join('.tmp', 'unreadable-'));
      try {
        expectResult([command, kind === 'missing' ? join(folder, 'missing') : folder], 2, '', 'INVALID_INPUT\n');
      } finally {
        rmSync(folder, { recursive: true, force: true });
      }
    });
  }

}

const summaries = [
  ['small total', 'a,1\nb,2\n', '{"count":2,"total":3}\n'],
  ['single zero', 'a,0', '{"count":1,"total":0}\n'],
  ['leading zeros', 'a,0002', '{"count":1,"total":2}\n'],
  ['exact unsafe total', 'a,9007199254740991\nb,2\n', '{"count":2,"total":9007199254740993}\n'],
  ['two max-safe amounts plus zero', 'a,9007199254740991\nb,9007199254740991\nc,0', '{"count":3,"total":18014398509481982}\n'],
];
for (const [name, bytes, stdout] of summaries) {
  test(`summarize ${name}`, () => {
    withInput(bytes, file => expectResult(['summarize', file], 0, stdout, ''));
  });
}
