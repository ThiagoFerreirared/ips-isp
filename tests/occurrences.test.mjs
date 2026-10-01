import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../src/lib/occurrences.js",import.meta.url),"utf8");
const {occurrencePayload,filterOccurrences,formatOccurrenceDate}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const sample={cidade:"ITAITUBA",olt:"itb1 1/5\nPON 0/3/15",cto:"RAMAL 05",motivo:"atenuado",protocolo:"20261001084103147970",inicio:"2026-10-01T08:39:00",status:"ABERTA"};
test("preserva protocolo longo, zeros iniciais e campos multilinha",()=>{
 const value=occurrencePayload({...sample,protocolo:"00"+sample.protocolo,id:"do-not-save"});
 assert.equal(value.protocolo,"0020261001084103147970");
 assert.equal(value.olt,sample.olt);
 assert.equal(value.id,undefined);
 assert.equal(formatOccurrenceDate(value.inicio),"01/10/2026 08:39:00");
});
test("exige cidade, motivo, datas válidas e encerramento coerente",()=>{
 for(const change of [{cidade:""},{motivo:" "},{inicio:"2026-02-30T10:00"},{status:"X"},{status:"RESOLVIDA",fim:""},{status:"RESOLVIDA",fim:"2026-09-30T10:00"}])assert.throws(()=>occurrencePayload({...sample,...change}));
 assert.equal(occurrencePayload({...sample,status:"RESOLVIDA",fim:"2026-10-01T09:00"}).fim,"2026-10-01T09:00");
 assert.equal(occurrencePayload({...sample,fim:"2026-10-01T09:00"}).fim,"");
});
test("combina filtros, mantém datas inclusivas e busca sem acentos",()=>{
 const records=[{...sample,id:"a",motivo:"Atenuação"},{...sample,id:"b",cidade:"SANTAREM",inicio:"2026-10-02T00:00:00",status:"RESOLVIDA"},{...sample,id:"c",inicio:"2026-10-01T23:59:59"}];
 assert.deepEqual(filterOccurrences(records,{cidade:"ITAITUBA",from:"2026-10-01",to:"2026-10-01"}).map(r=>r.id),["c","a"]);
 assert.equal(filterOccurrences(records,{search:"atenuacao"})[0].id,"a");
 assert.equal(filterOccurrences(records,{search:sample.protocolo,status:"RESOLVIDA"})[0].id,"b");
});
