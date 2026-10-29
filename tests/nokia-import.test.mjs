import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import { readRecords } from '../scripts/import-nokia.mjs';

function workbook(rows, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nokia-synthetic-test-'));
  try {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
      ['CODIGO', 'SERIAL', 'sec-key-ont'], ...rows,
    ]), 'Base_sec_key_ont');
    const file = path.join(dir, 'synthetic.xlsx');
    XLSX.writeFile(book, file);
    callback(file);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('import reads original headers, skips code-only filler and preserves alternative keys', () => {
  workbook([
    ['TEST', 'SALCLTEST1234', 'synthetic-one'],
    ['TEST', 'SALCLTEST1234', 'synthetic-one'],
    ['TEST', 'SALCLTEST1234', 'synthetic-two'],
    ['TEST', '', ''], ['', '', ''],
  ], file => {
    const result = readRecords(file);
    assert.equal(result.records.size, 2);
    assert.equal(result.duplicates, 1);
    assert.equal(result.codeOnly, 1);
    const record = [...result.records.values()][0];
    assert.equal(record.normalizedSerial, 'ALCLTEST1234');
    assert.ok(record.tokens.includes('1234'));
  });
});
test('incomplete pairs reject whole import without disclosing values', () => {
  workbook([['TEST', 'ALCLTEST1234', '']], file => {
    assert.throws(() => readRecords(file), /Registro inválido na linha 2; nenhum dado foi gravado/);
  });
});
