import test from "node:test";
import assert from "node:assert/strict";
import {getClient,getStatus,initialize} from "../src/services/earth-engine/client.js";
import {processAnalysisJob} from "../src/services/analysis/job.service.js";

test("Earth Engine disabled state is explicit and does not prevent startup",async()=>{
 assert.equal(await initialize(),"not_configured");assert.equal(getStatus(),"not_configured");
 assert.throws(()=>getClient(),{code:"EARTH_ENGINE_NOT_CONFIGURED"});
});

test("analysis worker records an Earth Engine failure without fake results",async()=>{
 const queries=[];
 const pool={query:async(sql,values)=>{queries.push({sql,values});if(sql.startsWith("UPDATE analysis_jobs SET status='PROCESSING'"))return{rowCount:1,rows:[{id:"job-1",analysis_type:"vegetation",satellite_source:"sentinel-2",start_date:"2026-01-01",end_date:"2026-02-01",geometry:{type:"Polygon",coordinates:[[[0,0],[0,.01],[.01,.01],[.01,0],[0,0]]]},parameters_json:{}}]};if(sql.startsWith("UPDATE analysis_jobs SET status='FAILED'"))return{rowCount:1,rows:[]};throw new Error(`Unexpected query: ${sql}`);}};
 await processAnalysisJob(pool,"job-1");
 const failure=queries.find(item=>item.sql.startsWith("UPDATE analysis_jobs SET status='FAILED'"));
 assert.ok(failure);assert.equal(failure.values[1],"EARTH_ENGINE_NOT_CONFIGURED");
 assert.equal(queries.some(item=>item.sql.includes("INSERT INTO analysis_results")),false);
});
