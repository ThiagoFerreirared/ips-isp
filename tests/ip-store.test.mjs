import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve("vite"))("esbuild");
const ipSource=readFileSync(new URL("../src/lib/ip.js",import.meta.url),"utf8");
const ip=await import("data:text/javascript;base64,"+Buffer.from(ipSource).toString("base64"));
const code=esbuild.transformSync(readFileSync(new URL("../src/lib/ipStore.js",import.meta.url),"utf8"),{format:"cjs"}).code;
function setup(seed={}) {
  let records=new Map(Object.entries(seed)), counter=0, tail=Promise.resolve(), failBackup=false;
  const ref=(...args)=>args.filter(x=>x!==db).join("/");
  const db={};
  const snap=(key)=>({exists:()=>records.has(key),data:()=>structuredClone(records.get(key))});
  const firestore={
    collection:ref,doc:(...args)=>ref(...args)+(args.length===1?"/auto"+(++counter):""),
    getDoc:async(key)=>{const value=snap(key).data();return {data:()=>value,exists:()=>value!==undefined}},
    getDocs:async(col)=>({docs:[...records].filter(([k])=>k.startsWith(col+"/")&&k.slice(col.length+1).indexOf("/")<0).map(([key,value])=>({id:key.slice(col.length+1),data:()=>structuredClone(value)}))}),
    serverTimestamp:()=>"timestamp",
    runTransaction:async(_,fn)=>{
      const run=tail.then(async()=>{
        const writes=[];
        const result=await fn({get:async(key)=>snap(key),set:(key,value,options)=>writes.push(["set",key,value,options]),update:(key,value)=>writes.push(["set",key,value,{merge:true}]),delete:(key)=>writes.push(["delete",key])});
        if(failBackup&&writes.some(([,k])=>k.startsWith("ip_backups/")))throw new Error("permission-denied");
        for(const [action,key,value,options] of writes){
          if(action==="delete")records.delete(key);
          else records.set(key,structuredClone(options?.merge?{...records.get(key),...value}:value));
        }
        return result;
      });
      tail=run.catch(()=>{});
      return run;
    }
  };
  const mod={exports:{}};
  vm.runInNewContext(code,{module:mod,exports:mod.exports,require:(name)=>{
    if(name==="firebase/firestore")return firestore;
    if(name==="../firebase/config")return {db,auth:{currentUser:{email:"test@example.test"}}};
    if(name==="./ip")return ip;
    throw new Error(name);
  }});
  return {api:mod.exports,records,failBackups:()=>{failBackup=true}};
}
test("salvamento reconhece legado invertido e impede duplicidade concorrente",async()=>{
  const {api,records}=setup({"ips_MANAUS/legacy":{ip:"cliente",login:"138.99.109.16"}});
  await assert.rejects(api.saveIP("MANAUS",{ip:"138.99.109.16",login:"outro"}),/já está/);
  const result=await Promise.allSettled([api.saveIP("MANAUS",{ip:"10.0.0.1",login:"A"}),api.saveIP("MANAUS",{ip:"10.0.0.1",login:"B"})]);
  assert.equal(result.filter(r=>r.status==="fulfilled").length,1);
  assert.equal([...records].filter(([k,v])=>k.startsWith("ips_MANAUS/")&&v.ip==="10.0.0.1").length,1);
});
test("edição, exclusão e importação compartilham bloqueio e histórico",async()=>{
  const {api,records}=setup({"ips_MANAUS/a":{ip:"10.0.0.1",login:"A"}});
  await api.saveIP("MANAUS",{ip:"10.0.0.1",login:"RESERVADO",id:"a",virtual:false},"a");
  assert.equal(records.get("ips_MANAUS/a").id,undefined);
  const result=await api.importIPs("MANAUS",[{ip:"10.0.0.1"},{ip:"10.0.0.2"},{ip:"10.0.0.2"}]);
  assert.equal(result.added,1);assert.equal(result.skipped,2);
  await api.deleteIP("MANAUS","a");
  assert.equal(records.has("ips_MANAUS/a"),false);
  assert.equal([...records.keys()].filter(k=>k.startsWith("historico/")).length,3);
});
test("migração faz backup atômico, preserva ID e é idempotente",async()=>{
  const {api,records}=setup({"ips_MANAUS/a":{ip:"cliente",login:"138.99.109.16",rede:"X"}});
  assert.equal(await api.migrateManaus(),1);
  assert.equal(records.get("ips_MANAUS/a").ip,"138.99.109.16");
  assert.equal(records.get("ips_MANAUS/a").rede,"X");
  const backup=[...records].find(([k])=>k.startsWith("ip_backups/"))[1];
  assert.equal(backup.original.ip,"cliente");assert.equal(backup.recordId,"a");
  assert.equal(await api.migrateManaus(),0);
});
test("falha no backup impede a migração",async()=>{
  const {api,records,failBackups}=setup({"ips_MANAUS/a":{ip:"cliente",login:"138.99.109.16"}});
  failBackups();
  await assert.rejects(api.migrateManaus(),/permission-denied/);
  assert.equal(records.get("ips_MANAUS/a").ip,"cliente");
  assert.equal([...records.keys()].filter(k=>k.startsWith("historico/")).length,0);
});
