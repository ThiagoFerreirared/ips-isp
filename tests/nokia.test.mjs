import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { makeLookup, normalizeSerial, serialTokens, validateQuery } from '../functions/nokia.js';

class LookupError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function fixture(records = []) {
  let rate;
  let queries = 0;
  let time = 100000;
  const db = {
    collection: name => name === 'privateNokiaRateLimits' ? { doc: uid => ({ uid }) } : {
      where: (field, op, value) => ({ limit: limit => ({ get: async () => {
        queries++;
        const hits = records.filter(row => op === '==' ? row[field] === value : row[field].includes(value)).slice(0, limit);
        return { empty: !hits.length, docs: hits.map(row => ({ data: () => row })) };
      } }) }),
    },
    runTransaction: async callback => callback({ get: async () => ({ data: () => rate }), set: (_ref, value) => { rate = value; } }),
  };
  return { run: makeLookup({ db, ErrorType: LookupError, now: () => time }), queries: () => queries, advance: () => { time += 60001; } };
}
const auth = { uid: 'synthetic-operator', token: { nokiaLookup: true } };
function record(serial, password = 'synthetic-only') {
  return { serial, password, code: 'TEST', normalizedSerial: normalizeSerial(serial), tokens: serialTokens(serial) };
}

test('normalization and substring index support SALCL, lowercase and suffixes', () => {
  assert.equal(validateQuery(' salcltest1234 '), 'ALCLTEST1234');
  assert.ok(serialTokens('SALCLTEST1234').includes('T123'));
  assert.ok(!serialTokens('ALCLTEST1234').includes('123'));
  for (const value of [null, {}, 'abc', '<script>', 'A'.repeat(33)]) assert.equal(validateQuery(value), null);
});
test('anonymous, unauthorized and malformed calls never query credentials', async () => {
  const f = fixture();
  await assert.rejects(f.run({ data: { query: '1234' } }), { code: 'unauthenticated' });
  for (const token of [{}, { nokiaLookup: 'true' }, { nokiaLookup: false }]) {
    await assert.rejects(f.run({ auth: { ...auth, token }, data: { query: '1234' } }), { code: 'permission-denied' });
  }
  await assert.rejects(f.run({ auth, data: { query: 'abc' } }), { code: 'invalid-argument' });
  assert.equal(f.queries(), 0);
});
test('exact matches take priority, multiple passwords survive, private index stays server-side', async () => {
  const f = fixture([record('ALCLTEST1234'), record('ALCLTEST1234', 'synthetic-alternative'), record('ALCLTEST12345')]);
  const result = await f.run({ auth, data: { query: 'salcltest1234' } });
  assert.equal(result.results.length, 2);
  assert.deepEqual(Object.keys(result.results[0]).sort(), ['code', 'password', 'serial']);
  assert.equal(f.queries(), 1);
});
test('substring results are bounded and indicate truncation; missing serial returns empty', async () => {
  const f = fixture(Array.from({ length: 25 }, (_, i) => record(`ALCLTEST${1000 + i}`)));
  const result = await f.run({ auth, data: { query: 'TEST' } });
  assert.equal(result.results.length, 20);
  assert.equal(result.truncated, true);
  assert.deepEqual((await f.run({ auth, data: { query: 'MISSING' } })).results, []);
});
test('rate limit persists between lookups and resets after a minute', async () => {
  const f = fixture();
  for (let i = 0; i < 60; i++) await f.run({ auth, data: { query: 'TEST' } });
  await assert.rejects(f.run({ auth, data: { query: 'TEST' } }), { code: 'resource-exhausted' });
  f.advance();
  await f.run({ auth, data: { query: 'TEST' } });
});

function ui() {
  const html = fs.readFileSync(new URL('../src/assets/operational-tools.html', import.meta.url), 'utf8');
  const code = html.slice(html.indexOf('    let nokiaRequest'), html.indexOf('    async function copiarTextoNokya'));
  const nodes = new Map();
  const element = () => ({ value: '', textContent: '', style: {}, children: [],
    classList: { add() {}, remove() {} }, replaceChildren() { this.children = []; },
    append(...items) { this.children.push(...items); }, focus() {} });
  const get = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  let listener;
  let tick = 0;
  const timers = new Map();
  const sent = [];
  const parent = { location: { origin: 'https://example.test' }, postMessage: data => sent.push(data) };
  const context = vm.createContext({
    document: { getElementById: get, createElement: element },
    window: { parent, location: { origin: 'https://example.test' }, addEventListener: (_type, handler) => { listener = handler; } },
    setTimeout: (callback, delay) => { timers.set(++tick, { callback, delay }); return tick; },
    clearTimeout: id => timers.delete(id), copiarTextoNokya() {},
  });
  vm.runInContext(code, context);
  return { get, sent, context,
    search(value) { get('inputSerialNokya').value = value; vm.runInContext('pesquisarNokya(false)', context); },
    flush() { for (const [id, timer] of [...timers]) if (timer.delay === 350) { timers.delete(id); timer.callback(); } },
    reply(data, source = parent) { listener({ source, origin: 'https://example.test', data: { type: 'nokia-results', ...data } }); },
  };
}
test('typing debounces requests; obsolete/foreign replies and replies after clear are ignored', () => {
  const f = ui();
  f.search('TES'); f.flush(); assert.equal(f.sent.length, 0);
  f.search('TEST'); f.search('TEST1'); f.flush(); assert.equal(f.sent.length, 1);
  const old = f.sent[0].id;
  f.search('TEST2'); f.flush();
  const id = f.sent[1].id;
  f.reply({ id: old, results: [record('OLD1')] });
  assert.equal(f.get('nokyaResKey').textContent, '-');
  f.reply({ id, results: [record('FAKE')] }, {});
  assert.equal(f.get('nokyaResKey').textContent, '-');
  f.reply({ id, results: [record('TEST2', '<img onerror=alert(1)>'), record('TEST3')] });
  assert.equal(f.get('nokyaResKey').textContent, '<img onerror=alert(1)>');
  assert.equal(f.get('nokyaList').children.length, 1);
  vm.runInContext('limparNokya()', f.context);
  f.reply({ id, results: [record('TEST2')] });
  assert.equal(f.get('nokyaResKey').textContent, '-');
});
test('errors and no-match clear secrets; manual upload and embedded database are removed', () => {
  const f = ui();
  f.search('TEST'); f.flush();
  const id = f.sent[0].id;
  f.reply({ id, results: [record('TEST1')] });
  f.reply({ id, error: 'Acesso negado' });
  assert.equal(f.get('nokyaResKey').textContent, '-');
  assert.equal(f.get('nokyaStatus').textContent, 'Acesso negado');
  f.reply({ id, results: [] });
  assert.equal(f.get('nokyaStatus').textContent, 'Nenhum serial encontrado.');
  const html = fs.readFileSync(new URL('../src/assets/operational-tools.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /loadLocalNokia|localNokiaFile|NOKYA_DB/);
});
