import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
function fixture(){
 const effects=[],states=[],calls=[],timers=new Map();let id=0;
 const context={JSON,Map,Set,db:{},auth:{currentUser:{uid:"operator"}},
 useState:()=>[{},s=>states.push(s)],useEffect:f=>effects.push(f),
 collection:(db,path)=>path,where:(...args)=>({where:args}),limit:n=>({limit:n}),query:(...args)=>args,
 onSnapshot:(q,ok,fail)=>{const c={q,ok,fail,stopped:false};calls.push(c);return()=>c.stopped=true;},
 setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:id=>timers.delete(id)};
 const source=readFileSync(new URL("../src/hooks/useCollection.js",import.meta.url),"utf8").replace(/^import .*;$/gm,"").replaceAll("export function ","function ");
 vm.createContext(context);vm.runInContext(source,context);
 return {context,states,calls,timers,mount(path,opts){context.useCollection(path,opts);return effects.pop()();}};
}
test("shares subscriptions during navigation and stops after last consumer",()=>{
 const f=fixture();const first=f.mount("ips_A");const second=f.mount("ips_A");assert.equal(f.calls.length,1);
 first();second();const third=f.mount("ips_A");assert.equal(f.calls.length,1);assert.equal(f.calls[0].stopped,false);
 third();for(const run of f.timers.values())run();assert.equal(f.calls[0].stopped,true);
});
test("resolved queries are limited and disabled queries make no request",()=>{
 const f=fixture();f.mount(null);assert.equal(f.calls.length,0);
 f.mount("ocorrencias",{statuses:["RESOLVIDA"],take:50});
 assert.equal(JSON.stringify(f.calls[0].q),JSON.stringify(["ocorrencias",{where:["status","in",["RESOLVIDA"]]},{limit:50}]));
});
test("quota errors retain loaded records and expose error",()=>{
 const f=fixture();f.mount("ips_A");f.calls[0].ok({docs:[{id:"a",data:()=>({ip:"1.2.3.4"})}]});
 f.calls[0].fail(Error("quota"));const state=f.states.at(-1);assert.equal(state.data.length,1);assert.equal(state.error.message,"quota");
});
