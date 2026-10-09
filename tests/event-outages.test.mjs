import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/lib/eventOutages.js',import.meta.url),'utf8');
const {eventOutages,eventPayload,outageColumn}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('legacy overnight outage infers next date',()=>{
 const q=eventOutages({data:'07/10/2026',hora_inicio:'21:36',hora_termino:'13:56'})[0];
 assert.equal(q.data_inicio,'2026-10-07');assert.equal(q.data_termino,'2026-10-08');assert.equal(q.hora_termino,'13:56');
});
test('multiple outages roundtrip and exports contain each interval',()=>{
 const form={data:'2026-10-07',protocolo:'0000123',quedas:[{data_inicio:'2026-10-07',hora_inicio:'08:00',data_termino:'2026-10-07',hora_termino:'09:00'},{data_inicio:'2026-10-07',hora_inicio:'14:00',data_termino:'2026-10-07',hora_termino:''}]};
 const saved=eventPayload(form);assert.equal(saved.quedas.length,2);assert.equal(saved.protocolo,'0000123');assert.equal(saved.quedas[1].data_termino,'');
 assert.match(outageColumn(saved,'inicio'),/14:00/);assert.match(outageColumn(saved,'termino'),/Em aberto/);
 assert.deepEqual(eventOutages(saved),saved.quedas);
});
test('invalid dates, hours and reversed end rejected',()=>{
 for(const q of [{data_inicio:'2026-02-30',hora_inicio:'08:00'},{data_inicio:'2026-10-07',hora_inicio:'25:00'},{data_inicio:'2026-10-07',hora_inicio:'21:00',data_termino:'2026-10-07',hora_termino:'13:00'}])assert.throws(()=>eventPayload({quedas:[q]}));
});
