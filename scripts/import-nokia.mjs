// Run locally with Application Default Credentials. Never place the workbook in this repo.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import XLSX from 'xlsx';
import { COLLECTION, normalizeSerial, serialTokens } from '../functions/nokia.js';

export function readRecords(file) {
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets.Base_sec_key_ont;
  if (!sheet) throw new Error('Aba Base_sec_key_ont ausente.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const headers = rows.shift().map(value => String(value).trim());
  const columns = ['CODIGO', 'SERIAL', 'sec-key-ont'].map(name => headers.indexOf(name));
  if (columns.includes(-1)) throw new Error('Colunas esperadas ausentes.');
  const records = new Map();
  let blank = 0;
  let duplicates = 0;
  let codeOnly = 0;
  rows.forEach((row, index) => {
    const [code, serial, password] = columns.map(col => String(row[col] ?? '').trim());
    if (!code && !serial && !password) { blank++; return; }
    // Original export contains product-code filler rows with no ONT serial/key.
    if (code && !serial && !password) { codeOnly++; return; }
    if (!/^[A-Z0-9]{4,32}$/i.test(serial) || !password || password.length > 128) {
      throw new Error(`Registro inválido na linha ${index + 2}; nenhum dado foi gravado.`);
    }
    const record = { code, serial: serial.toUpperCase(), password };
    const id = createHash('sha256').update(JSON.stringify(record)).digest('hex');
    if (records.has(id)) duplicates++;
    records.set(id, { ...record, normalizedSerial: normalizeSerial(serial), tokens: serialTokens(serial) });
  });
  if (!records.size) throw new Error('Base vazia.');
  return { records, blank, duplicates, codeOnly };
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file || flags.some(flag => !['--write', '--project=ips-isp'].includes(flag))) {
    throw new Error('Uso: node scripts/import-nokia.mjs <arquivo.xlsx> [--write --project=ips-isp]');
  }
  const { records, blank, duplicates, codeOnly } = readRecords(file);
  console.log(JSON.stringify({ valid: records.size, blank, codeOnly, duplicates, mode: flags.includes('--write') ? 'write' : 'dry-run' }));
  if (!flags.includes('--write')) return;
  if (!flags.includes('--project=ips-isp')) throw new Error('Confirme o projeto com --project=ips-isp.');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  initializeApp({ credential: applicationDefault(), projectId: 'ips-isp' });
  const db = getFirestore();
  const base = db.collection(COLLECTION);
  const existing = await base.select().get();
  if (existing.docs.some(doc => !records.has(doc.id))) {
    throw new Error('Base existente diferente. Interrompido para evitar registros obsoletos; planeje substituição privada.');
  }
  const entries = [...records];
  for (let offset = 0; offset < entries.length; offset += 400) {
    const batch = db.batch();
    for (const [id, data] of entries.slice(offset, offset + 400)) batch.set(base.doc(id), data);
    await batch.commit();
  }
  console.log(`Importação concluída: ${entries.length} registros privados. Execute novamente em caso de interrupção.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // SDK errors may contain request data. Do not print raw server error payloads.
    console.error(error.code ? 'Falha no acesso privado. Verifique credenciais, projeto e permissões.' : error.message);
    process.exitCode = 1;
  });
}
