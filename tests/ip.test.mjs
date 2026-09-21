import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/ip.js", import.meta.url), "utf8");
const { normalizeIPRecord, sortIP, detectarBlocos, listCityIPs } = await import(
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

test("completa Manaus desde .1 sem duplicar registros nem presumir disponibilidade", () => {
  const data = [{id:"saved", ip:"cliente", login:"138.99.109.16"}, {id:"free", ip:"138.99.109.2", login:"VAGO"}, {id:"other", ip:"10.0.0.1", login:"equipamento"}];
  const rows = listCityIPs(data,"MANAUS");
  assert.equal(rows.length,512);
  assert.deepEqual(rows.filter(r=>r.ip.startsWith("138.99.109.")).slice(0,5).map(r=>r.ip),["138.99.109.0","138.99.109.1","138.99.109.2","138.99.109.3","138.99.109.4"]);
  assert.equal(rows.filter(r=>r.ip==="138.99.109.16").length,1);
  assert.equal(rows.find(r=>r.ip==="138.99.109.16").id,"saved");
  assert.equal(rows.find(r=>r.ip==="138.99.109.2").virtual,undefined);
  assert.equal(rows.find(r=>r.ip==="138.99.109.1").login,"Não cadastrado");
  assert.equal(rows.filter(r=>r.virtual).length,509);
  assert.equal(rows.some(r=>r.ip==="138.99.109.0" || r.ip==="138.99.109.255"),true);
  assert.equal(data.length,3);
});

test("não inventa blocos sem dados e substitui a linha virtual ao cadastrar", () => {
  assert.equal(listCityIPs([],"SANTAREM").length,0);
  const rows=listCityIPs([{id:"new",ip:"138.99.109.1",login:"cliente"}],"MANAUS");
  assert.equal(rows.length,256);
  assert.equal(rows[1].id,"new");
  assert.equal(rows[1].virtual,undefined);
});

test("completa múltiplos blocos em qualquer cidade, preservando .0 e .255 cadastrados", () => {
 for (const cidade of ["SANTAREM","ITAITUBA","RUROPOLIS","NOVA_CIDADE"]) {
  const data=[{id:"zero",ip:"10.0.1.0",login:"rede"},{id:"last",ip:"10.0.1.255",login:"reservado"},{id:"second",ip:"10.0.2.9",login:"cliente"}];
  const rows=listCityIPs(data,cidade);
  assert.equal(rows.length,512);
  assert.equal(rows[0].id,"zero");
  assert.equal(rows[255].id,"last");
  assert.equal(rows[256].ip,"10.0.2.0");
  assert.equal(rows[511].ip,"10.0.2.255");
  assert.equal(new Set(rows.map(r=>r.ip)).size,512);
 }
});

test("não expande IPv6 ou endereços inválidos",()=>{
 const records=[{ip:"2001:db8::1",login:"cliente"},{ip:"999.1.1.1",login:"cliente"}];
 assert.equal(listCityIPs(records,"IPV6_WSP").length,2);
});
