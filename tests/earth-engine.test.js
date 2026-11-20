import test from "node:test";
import assert from "node:assert/strict";
import {getClient,getEarthEngineStatus,getStatus,initialize} from "../src/services/earth-engine/client.js";
import {runEarthEngineAnalysis} from "../src/services/analysis/earthEngineAnalysis.service.js";
import {processAnalysisJob} from "../src/services/analysis/job.service.js";

function createVegetationEngine({counts=[2,3],validAreas=[800000,700000,600000],stats=[{NDVI_mean:.2,NDVI_min:-.1,NDVI_max:.7},{NDVI_mean:.5,NDVI_min:0,NDVI_max:.9}],changeMean=0.3,aoiArea=1000000}={}){
 const collections=[],dateFilters=[],maskedClasses=[],commonMasks=[],selectedBands=[],expressions=[],denominatorThresholds=[],visualizations=[];
 class Computed{constructor(value){this.value=value;}evaluate(callback){callback(this.value,null);}}
 class Mask{constructor(kind,values=[]){this.kind=kind;this.values=values;}and(other){return new Mask(this.kind==="scl"&&other.kind==="scl"?"scl":"common",[...new Set([...this.values,...other.values])]);}}
 class Image{constructor(name,period=0,maskKind="period"){this.name=name;this.period=period;this.maskKind=maskKind;}
  select(bands){if(Array.isArray(bands))selectedBands.push(bands);return new Image(this.name,this.period,this.maskKind);}
  neq(value){return new Mask("scl",[value]);}
  and(other){return new Mask("scl",[...new Set([...this.values||[],...other.values||[]])]);}
  add(){return this;}
  abs(){return this;}
  gt(value){denominatorThresholds.push(value);return new Mask("denominator",[value]);}
  updateMask(mask){if(this.name.startsWith("scene-")){maskedClasses.push(mask.values);return this;}if(mask.kind==="denominator")return new Image(this.name,this.period,this.maskKind);if(this.name==="pixel-area")return new Image(`pixel-area-${mask.kind==="common"?"common":mask.values[0]??"period"}`,mask.values[0]||0,mask.kind);commonMasks.push(mask.kind);return new Image(`${this.name}-common`,this.period,"common");}
  median(){return this;}
  expression(formula,variables){expressions.push({formula,bands:Object.keys(variables)});return new Image(`ndvi-${this.period}`,this.period);}
  clip(){return this;}
  mask(){return new Mask(this.maskKind,this.maskKind==="period"?[this.period]:[]);}
  subtract(){return new Image("difference",0,"common");}
  rename(name){this.bandName=name;return this;}
  reduceRegion(){if(this.name.startsWith("pixel-area-")){const area=this.name.endsWith("common")?validAreas[2]:validAreas[this.period-1];return new Computed({valid_area:area});}if(this.name==="difference")return new Computed({NDVI_change_mean:changeMean});return new Computed(stats[this.period-1]);}
  getMap(params,callback){visualizations.push(params);callback({urlFormat:`https://mock-earth-engine.test/${this.name}/{z}/{x}/{y}`},null);}
 }
 const engine={
  Geometry:geometry=>({geometry,area:()=>new Computed(aoiArea)}),
  Filter:{lte:(key,value)=>({key,value})},
  ImageCollection:id=>{const period=collections.length+1,collection={id,period,filterBounds(){return this;},filterDate(start,end){dateFilters.push([start,end]);return this;},filter(){return this;},map(mapper){mapper(new Image(`scene-${period}`,period));return this;},size:()=>new Computed(counts[period-1]),median:()=>new Image(`composite-${period}`,period)};collections.push(collection);return collection;},
  Image:{pixelArea:()=>new Image("pixel-area")},
  Reducer:{mean:()=>({combine(){return this;}}),minMax:()=>({}),sum:()=>({})}
 };
 return {engine,collections,dateFilters,maskedClasses,commonMasks,selectedBands,expressions,denominatorThresholds,visualizations};
}

const comparisonRequest={analysisType:"vegetation",dataset:"sentinel-2",geometry:{type:"Polygon",coordinates:[]},startDate:"2025-01-01",endDate:"2025-01-31",comparisonStartDate:"2025-06-01",comparisonEndDate:"2025-06-30",parameters:{cloudCover:25}};
const disabledSettings={eeEnabled:false,eeConfigurationValid:false};

test("Earth Engine disabled state is explicit and does not prevent startup",async()=>{
 assert.equal(await initialize({settings:disabledSettings}),"not_configured");assert.equal(getStatus(),"not_configured");
 assert.throws(()=>getClient(),{code:"EARTH_ENGINE_NOT_CONFIGURED"});
 assert.deepEqual(getEarthEngineStatus(disabledSettings),{status:"unavailable",configured:false,initialized:false});
});

test("Earth Engine reports missing configuration without exposing environment details",async()=>{
 const settings={eeEnabled:true,eeConfigurationValid:false,eeMissing:["GOOGLE_APPLICATION_CREDENTIALS"]};
 assert.equal(await initialize({settings}),"configuration_error");
 assert.deepEqual(getEarthEngineStatus(settings),{status:"unavailable",configured:false,initialized:false});
 assert.equal(JSON.stringify(getEarthEngineStatus(settings)).includes("GOOGLE_APPLICATION_CREDENTIALS"),false);
});

test("Earth Engine initialization can be verified with mocked credentials and SDK",async t=>{
 const settings={eeEnabled:true,eeConfigurationValid:true,eeCredentials:"mock-credentials.json",eeProject:"mock-project"},calls=[];
 const engine={data:{authenticateViaPrivateKey(key,success){calls.push(["authenticate",key]);success();}},initialize(_url,_key,success,_failure,_auth,_project){calls.push(["initialize",_project]);success();}};
 t.after(()=>initialize({settings:disabledSettings}));
 assert.equal(await initialize({settings,engine,loadCredentials:async path=>({path,private_key:"MOCK_PRIVATE_KEY"})}),"connected");
 assert.deepEqual(calls,[["authenticate",{path:"mock-credentials.json",private_key:"MOCK_PRIVATE_KEY"}],["initialize","mock-project"]]);
 assert.deepEqual(getEarthEngineStatus(settings),{status:"configured",configured:true,initialized:true});
});

test("Earth Engine initialization failure is reported without raw exception details",async t=>{
 const settings={eeEnabled:true,eeConfigurationValid:true,eeCredentials:"mock-credentials.json",eeProject:"mock-project"},secret="PRIVATE_KEY_DO_NOT_LEAK";
 const engine={data:{authenticateViaPrivateKey(_key,_success,failure){failure(new Error(secret));}},initialize(){assert.fail("SDK initialization should not run after authentication fails");}};
 t.after(()=>initialize({settings:disabledSettings}));
 assert.equal(await initialize({settings,engine,loadCredentials:async()=>({private_key:secret})}),"initialization_error");
 const response=getEarthEngineStatus(settings);
 assert.deepEqual(response,{status:"initialization_error",configured:true,initialized:false});
 assert.equal(JSON.stringify(response).includes(secret),false);
});

test("invalid credential material is reported as an initialization error",async t=>{
 const settings={eeEnabled:true,eeConfigurationValid:true,eeCredentials:"mock-credentials.json",eeProject:"mock-project"},secret="PRIVATE_KEY_DO_NOT_LEAK";
 t.after(()=>initialize({settings:disabledSettings}));
 assert.equal(await initialize({settings,loadCredentials:async()=>{throw new Error(secret);}}),"initialization_error");
 assert.deepEqual(getEarthEngineStatus(settings),{status:"initialization_error",configured:true,initialized:false});
});

test("Sentinel-2 vegetation comparison returns both periods and common-pixel change",async()=>{
 const mock=createVegetationEngine(),result=await runEarthEngineAnalysis(comparisonRequest,mock.engine);
 assert.equal(mock.collections.length,2);assert.ok(mock.collections.every(collection=>collection.id==="COPERNICUS/S2_SR_HARMONIZED"));
 assert.deepEqual(mock.dateFilters,[ ["2025-01-01","2025-02-01"],["2025-06-01","2025-07-01"] ]);
 assert.ok(mock.selectedBands.every(bands=>JSON.stringify(bands)==='["B4","B8"]'));
 assert.ok(mock.expressions.every(expression=>expression.formula==="(nir - red) / (nir + red)"&&expression.bands.includes("nir")&&expression.bands.includes("red")));
 assert.deepEqual(mock.denominatorThresholds,[1e-6,1e-6]);
 assert.ok(mock.maskedClasses.every(classes=>[0,1,3,8,9,10,11].every(value=>classes.includes(value))));
 assert.deepEqual(result.statistics.period1,{meanNDVI:.2,minNDVI:-.1,maxNDVI:.7,imageCount:2,validPixelCoveragePercent:80});
 assert.deepEqual(result.statistics.period2,{meanNDVI:.5,minNDVI:0,maxNDVI:.9,imageCount:3,validPixelCoveragePercent:70});
 assert.equal(result.statistics.comparison.meanNDVIChange,.3);assert.equal(result.statistics.comparison.commonValidPixelCoveragePercent,60);
 assert.equal(result.statistics.meanNDVIChangeCommonValidPixels,.3);
 assert.ok(result.qualityWarnings.some(warning=>warning.includes("image counts differ substantially")));
 assert.equal(result.layers.length,3);assert.equal(result.layers[2].id,"ndvi-change");assert.equal(mock.commonMasks.filter(mask=>mask==="common").length,2);
 assert.deepEqual(mock.visualizations[2],{min:-2,max:2,palette:["b2182b","f7f7f7","1a9850"]});assert.deepEqual(result.methodology.differenceVisualization,{min:-2,max:2,neutral:0,palette:["b2182b","f7f7f7","1a9850"]});
});

test("vegetation comparison rejects an empty collection in either date period",async()=>{
 for(const counts of [[0,3],[2,0]]){
  const mock=createVegetationEngine({counts});
  await assert.rejects(runEarthEngineAnalysis(comparisonRequest,mock.engine),{code:"NO_IMAGERY_AVAILABLE"});
 }
});

test("vegetation comparison rejects inadequate common valid-pixel coverage",async()=>{
 const mock=createVegetationEngine({validAreas:[800000,700000,5000]});
 await assert.rejects(runEarthEngineAnalysis(comparisonRequest,mock.engine),{code:"INSUFFICIENT_VALID_PIXELS"});
});

test("vegetation comparison does not treat missing Earth Engine statistics as zero",async()=>{
 const mock=createVegetationEngine({stats:[{NDVI_mean:null,NDVI_min:null,NDVI_max:null},{NDVI_mean:.5,NDVI_min:0,NDVI_max:.9}]});
 await assert.rejects(runEarthEngineAnalysis(comparisonRequest,mock.engine),{code:"INSUFFICIENT_VALID_PIXELS"});
});

test("analysis worker records an Earth Engine failure without fake results",async()=>{
 const queries=[];
 const pool={query:async(sql,values)=>{queries.push({sql,values});if(sql.startsWith("UPDATE analysis_jobs SET status='PROCESSING'"))return{rowCount:1,rows:[{id:"job-1",analysis_type:"vegetation",satellite_source:"sentinel-2",start_date:"2026-01-01",end_date:"2026-02-01",geometry:{type:"Polygon",coordinates:[[[0,0],[0,.01],[.01,.01],[.01,0],[0,0]]]},parameters_json:{}}]};if(sql.startsWith("UPDATE analysis_jobs SET status='FAILED'"))return{rowCount:1,rows:[]};throw new Error(`Unexpected query: ${sql}`);}};
 await processAnalysisJob(pool,"job-1");
 const failure=queries.find(item=>item.sql.startsWith("UPDATE analysis_jobs SET status='FAILED'"));
 assert.ok(failure);assert.equal(failure.values[1],"EARTH_ENGINE_NOT_CONFIGURED");
 assert.equal(queries.some(item=>item.sql.includes("INSERT INTO analysis_results")),false);
});
