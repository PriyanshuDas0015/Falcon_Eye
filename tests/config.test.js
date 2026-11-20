import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

const projectRoot=fileURLToPath(new URL("../",import.meta.url));
function loadProductionConfig(sessionSecret){
 return spawnSync(process.execPath,["--input-type=module","-e","import('./src/config/env.js')"],{cwd:projectRoot,encoding:"utf8",env:{...process.env,NODE_ENV:"production",SESSION_SECRET:sessionSecret,PORT:"3000"}});
}

test("production rejects missing, short, and example session secrets",()=>{
 for(const secret of ["","too-short","replace-with-a-long-random-secret","development-only-change-this-secret"])assert.notEqual(loadProductionConfig(secret).status,0);
});

test("production accepts a private session secret with sufficient length",()=>{
 assert.equal(loadProductionConfig("phase-five-test-secret-with-more-than-32-characters").status,0);
});
