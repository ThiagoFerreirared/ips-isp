import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = (name) => readFileSync(new URL("../src/lib/" + name + ".js", import.meta.url), "utf8");
const url = (text) => "data:text/javascript;base64," + Buffer.from(text).toString("base64");
const ipURL = url(source("ip"));
const { parseCIDR, inSubnet, subnetOptions, expandConfiguredBlocks } = await import(url(source("subnets").replace('"./ip"', JSON.stringify(ipURL))));
const { mapSheetRows, previewImport } = await import(url(source("ipImport").replace('"./ip"', JSON.stringify(ipURL))));

test("filtros /28 /29 /30 incluem extremos e excluem vizinhos", () => {
  for (const [prefix, end] of [[28,31],[29,23],[30,19]]) {
    const cidr = "138.99.109.16/" + prefix;
    assert.equal(inSubnet("138.99.109.16",cidr),true);
    assert.equal(inSubnet("138.99.109." + end,cidr),true);
    assert.equal(inSubnet("138.99.109.15",cidr),false);
    assert.equal(inSubnet("138.99.109." + (end+1),cidr),false);
  }
  assert.equal(parseCIDR("138.99.109.19/30").cidr,"138.99.109.16/30");
  assert.equal(parseCIDR("255.255.255.255/30").end,4294967295);
  assert.equal(parseCIDR("1.2.3.4/0"),null);
  assert.equal(parseCIDR("1.2.3.4/no"),null);
});
test("configuração expande só a faixa configurada sem apagar registros externos",()=>{
  const rows=expandConfiguredBlocks([{id:"a",ip:"10.0.0.17",login:"cliente"},{id:"b",ip:"10.1.1.1",login:"VAGO"}],["10.0.0.16/30","10.0.0.16/29"]);
  assert.equal(rows.length,9);
  assert.equal(rows.find(r=>r.ip==="10.0.0.17").id,"a");
  assert.deepEqual(subnetOptions(rows,30),["10.0.0.16/30","10.0.0.20/30","10.1.1.0/30"]);
});
test("importação reconhece cabeçalhos, avisa duplicados e bloqueia IP inválido",()=>{
  const rows=mapSheetRows([["Login","Data","IP"],["Cliente","21/09/2026","10.0.0.1"]]);
  assert.deepEqual(rows,[["10.0.0.1","Cliente","21/09/2026"]]);
  assert.throws(()=>mapSheetRows([["Foo","Bar"]]),/coluna IP/);
  const preview=previewImport([["10.0.0.1","A"],["10.0.0.1","B"],["300.0.0.1","C"],["cliente","138.99.109.16"]],"MANAUS",[{ip:"10.0.0.1"}]);
  assert.match(preview[0].error,/Já cadastrado/);
  assert.match(preview[1].error,/Repetido/);
  assert.match(preview[2].error,/inválido/);
  assert.equal(preview[3].corrected,true);
  assert.equal(preview[3].record.ip,"138.99.109.16");
});
