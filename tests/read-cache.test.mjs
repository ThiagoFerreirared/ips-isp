import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../src/lib/readCache.js",import.meta.url),"utf8");
const {createReadCache}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
test("shares in-flight and fresh reads",async()=>{
 const cache=createReadCache();let reads=0;const read=async()=>++reads;
 assert.deepEqual(await Promise.all([cache.get("city",read),cache.get("city",read)]),[1,1]);
 assert.equal(await cache.get("city",read),1);assert.equal(reads,1);
 assert.equal(await cache.get("other",read),2);
});
test("refresh, expiry and logout invalidate cached reads",async()=>{
 let reads=0;const read=async()=>++reads;const cache=createReadCache();
 await cache.get("city",read);assert.equal(await cache.get("city",read,true),2);
 cache.clear();assert.equal(await cache.get("city",read),3);
 const expired=createReadCache(-1);await expired.get("city",read);assert.equal(await expired.get("city",read),5);
});
test("failed reads do not become empty cached results",async()=>{
 const cache=createReadCache();await assert.rejects(cache.get("city",async()=>{throw Error("quota");}));
 assert.equal(await cache.get("city",async()=>42),42);
});
