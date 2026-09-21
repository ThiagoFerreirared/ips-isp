import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/ip.js", import.meta.url), "utf8");
const { normalizeIPRecord, sortIP, detectarBlocos } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);

test("corrige Manaus preservando os demais campos e o original", () => {
  const original = { id: "a", ip: "cliente@exemplo.com", login: "138.99.109.213", rede: "rede", obs: "obs" };
  const result = normalizeIPRecord(original, "MANAUS");
  assert.deepEqual(result, { ...original, ip: "138.99.109.213", login: "cliente@exemplo.com" });
  assert.equal(original.ip, "cliente@exemplo.com");
  assert.equal(normalizeIPRecord(result, "MANAUS"), result);
});

test("preserva registros corretos, ambíguos e outras cidades", () => {
  for (const record of [
    { ip: "138.99.109.19", login: "CDN YOUCAST" },
    { ip: "138.99.109.19", login: "138.99.109.20" },
    { ip: "cliente", login: "999.99.109.19" },
    { ip: "cliente", login: "2001:db8::1" },
  ]) assert.equal(normalizeIPRecord(record, "MANAUS"), record);
  const other = { ip: "cliente", login: "138.99.109.19" };
  assert.equal(normalizeIPRecord(other, "SANTAREM"), other);
});

test("aceita espaços no IP invertido e login vazio", () => {
  assert.deepEqual(normalizeIPRecord({ ip: "", login: " 138.99.109.19 " }, "MANAUS"),
    { ip: "138.99.109.19", login: "VAGO" });
});

test("ordena numericamente antes da paginação e identifica blocos", () => {
  const records = ["138.99.110.1", "138.99.109.213", "138.99.109.202", "138.99.109.19", "138.99.109.2"]
    .map((login, i) => normalizeIPRecord({ id: i, ip: "cliente" + i, login }, "MANAUS"))
    .sort((a, b) => sortIP(a.ip) - sortIP(b.ip));
  assert.deepEqual(records.map(r => r.ip),
    ["138.99.109.2", "138.99.109.19", "138.99.109.202", "138.99.109.213", "138.99.110.1"]);
  assert.deepEqual(detectarBlocos(records), ["TODOS", "138.99.109", "138.99.110"]);
});
