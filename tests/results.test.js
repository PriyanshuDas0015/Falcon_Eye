import test from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { createResultsDashboard } from "../public/js/results.js";
import { renderCharts } from "../public/js/charts.js";
import { loadMapPreview, writeAnalysisReport } from "../src/utils/analysisReport.js";

class Element{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.style={};this.listeners={};this.classList={names:new Set(),add(name){this.names.add(name);},remove(name){this.names.delete(name);},contains(name){return this.names.has(name);}};this.value="";this.textContent="";this.hidden=false;this.disabled=false;this.checked=true;this.attributes={};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 addEventListener(name,handler){this.listeners[name]=handler;}
 emit(name,target=this){this.listeners[name]?.({target});}
}
function fakeDocument(){const elements=new Map();return{querySelector(selector){if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);},createElement(tag){return new Element(tag);}};}
function streamFrom(chunks,onCancel=()=>{}){let index=0;return{async cancel(){onCancel();},getReader(){return{async read(){return index<chunks.length?{done:false,value:chunks[index++]}:{done:true};},async cancel(){onCancel();}};}};}
function imageResponse(chunks,{ok=true,type="image/png",length=null,onCancel=()=>{}}={}){return{ok,headers:{get(name){return name==="content-type"?type:length;}},body:streamFrom(chunks,onCancel)};}

const mockResult={
 analysisType:"vegetation",dataset:{name:"Sentinel-2"},dateRange:{start:"2023-01-01",end:"2023-02-01"},comparisonDateRange:{start:"2024-01-01",end:"2024-02-01"},area:{aoiSqKm:12.34},
 statistics:{period1:{meanNDVI:.41,minNDVI:-.2,maxNDVI:.88,validPixelCoveragePercent:83.2,imageCount:4},period2:{meanNDVI:.56,minNDVI:-.1,maxNDVI:.92,validPixelCoveragePercent:79.5,imageCount:5},comparison:{meanNDVIChange:.15,commonValidPixelCoveragePercent:71.8}},
 layers:[{id:"ndvi-period-1",name:"Period 1 NDVI",type:"tile",url:"https://earthengine.googleapis.com/map/a/{z}/{x}/{y}",opacity:.8,legend:[{label:"−1.00 NDVI",value:-1,color:"8c2d04"},{label:"−0.50 NDVI",value:-.5,color:"d8b365"},{label:"0.00 NDVI",value:0,color:"f6e8c3"},{label:"+0.50 NDVI",value:.5,color:"a6dba0"},{label:"+1.00 NDVI",value:1,color:"1b7837"}]},{id:"ndvi-period-2",name:"Period 2 NDVI",type:"tile",url:"https://earthengine.googleapis.com/map/b/{z}/{x}/{y}",opacity:.8,legend:[{label:"−1.00 NDVI",value:-1,color:"8c2d04"},{label:"−0.50 NDVI",value:-.5,color:"d8b365"},{label:"0.00 NDVI",value:0,color:"f6e8c3"},{label:"+0.50 NDVI",value:.5,color:"a6dba0"},{label:"+1.00 NDVI",value:1,color:"1b7837"}]},{id:"ndvi-change",name:"NDVI Change",type:"tile",url:"https://earthengine.googleapis.com/map/c/{z}/{x}/{y}",opacity:.8,legend:[{label:"Decrease",color:"b2182b"},{label:"No change",color:"f7f7f7"},{label:"Increase",color:"1a9850"}]}],
 charts:[{type:"bar",title:"Mean NDVI and common-pixel change",labels:["Period 1","Period 2","Mean change"],series:[{name:"NDVI",data:[.41,.56,.15]}]}],qualityWarnings:["Filtered Sentinel-2 image counts differ substantially."],methodology:{formula:"NDVI = (B8 − B4) / (B8 + B4)"}
};

test("mock API result layer switching keeps legend and statistics tied to selected layer",()=>{
 const document=fakeDocument(),map={added:[],removed:[],addLayer(layer){this.added.push(layer);},removeLayer(layer){this.removed.push(layer);}},leaflet={tileLayer(url,options){return{url,options,handlers:{},addTo(target){target.addLayer(this);return this;},on(name,handler){this.handlers[name]=handler;},setOpacity(value){this.opacity=value;}};}};
 const view=createResultsDashboard({document,map,leaflet});view.render(mockResult);
 const select=document.querySelector("#result-layer-select"),legend=document.querySelector("#result-legend"),stats=document.querySelector("#result-stats");
 assert.ok(stats.children.some(child=>child.className==="notice warning result-quality-warning"));
 const groups=stats.children.find(child=>child.className==="result-stat-groups");
 assert.equal(map.added[0].url,mockResult.layers[0].url);assert.match(groups.children[0].children[1].children[0].children[1].textContent,/0\.410/);assert.equal(legend.children.length,5);assert.deepEqual(legend.children.map(item=>item.children[1].textContent),mockResult.layers[0].legend.map(item=>item.label));
 select.value="ndvi-period-2";select.emit("change");assert.equal(map.added[1].url,mockResult.layers[1].url);assert.equal(legend.children.length,5);assert.deepEqual(legend.children.map(item=>item.children[1].textContent),mockResult.layers[1].legend.map(item=>item.label));
 select.value="ndvi-change";select.emit("change");
 assert.equal(map.removed.length,2);assert.equal(map.added[2].url,mockResult.layers[2].url);assert.equal(legend.children[0].children[1].textContent,"Decrease");assert.equal(document.querySelector("#result-map-status").hidden,true);
 document.querySelector("#layer-opacity").value="0.35";document.querySelector("#layer-opacity").emit("input",document.querySelector("#layer-opacity"));assert.equal(map.added[2].opacity,.35);
 document.querySelector("#layer-visible").emit("change",{checked:false});assert.equal(map.removed.length,3);
});

test("malformed historical result fields do not break result rendering",()=>{
 const document=fakeDocument(),map={addLayer(){},removeLayer(){}},leaflet={tileLayer(){return{addTo(){return this;},on(){},setOpacity(){}};}},view=createResultsDashboard({document,map,leaflet});
 assert.doesNotThrow(()=>view.render({analysisType:null,statistics:"not-an-object",layers:"not-an-array"}));
 assert.match(document.querySelector("#result-map-status").textContent,/no valid map layers/i);
 assert.doesNotThrow(()=>view.render({statistics:{period1:{},period2:{},comparison:{}},layers:[{id:"old-layer",type:"tile",url:"https://earthengine.googleapis.com/map/old/{z}/{x}/{y}",legend:[null,{label:"Valid entry",color:"00ff00"}]}]}));
 assert.equal(document.querySelector("#result-legend").children.length,1);
});

test("existing Chart.js integration renders backend comparison labels and values",()=>{
 let captured;class ChartMock{constructor(canvas,config){captured={canvas,config};}destroy(){}}
 const panel=new Element(),canvas=new Element();renderCharts(mockResult.charts,{panel,canvas,ChartClass:ChartMock});
 assert.deepEqual(captured.config.data.labels,["Period 1","Period 2","Mean change"]);assert.deepEqual(captured.config.data.datasets[0].data,[.41,.56,.15]);assert.equal(panel.classList.contains("hidden"),false);
});

test("charts normalize null and nonnumeric points and hide malformed or missing series",()=>{
 let captured;class ChartMock{constructor(canvas,config){captured={canvas,config};}destroy(){}}
 const panel=new Element(),canvas=new Element(),chart={labels:["P1","P2","Change"],series:[{name:"NDVI",data:[.41,null,"bad"]}]};
 renderCharts([chart],{panel,canvas,ChartClass:ChartMock});assert.deepEqual(captured.config.data.datasets[0].data,[.41,null,null]);
 renderCharts([{labels:["P1"],series:[{name:"broken",data:"not-an-array"}]}],{panel,canvas,ChartClass:ChartMock});assert.equal(panel.classList.contains("hidden"),true);
 assert.doesNotThrow(()=>renderCharts([null,{labels:"bad",series:null}],{panel,canvas,ChartClass:ChartMock}));assert.equal(panel.classList.contains("hidden"),true);
});

test("PDF report uses mocked Earth Engine tiles and actual comparison statistics",async()=>{
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WioAAAAASUVORK5CYII=","base64");
 const fetchCalls=[],fetchImpl=async(url,options)=>{fetchCalls.push({url,options});return imageResponse([png]);};
 const analysis={id:"test-report",analysis_type:"vegetation",satellite_source:"sentinel-2",start_date:"2023-01-01",end_date:"2023-02-01",completed_at:"2024-02-02T00:00:00Z",geometry_json:{type:"Polygon",coordinates:[[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]]},result_json:mockResult};
 const doc=new PDFDocument({margin:52,compress:false}),chunks=[];doc.on("data",chunk=>chunks.push(chunk));
 const done=new Promise(resolve=>doc.on("end",resolve));await writeAnalysisReport(doc,analysis,{fetchImpl});doc.end();await done;
 const pdf=Buffer.concat(chunks),pdfText=pdf.toString("latin1");assert.equal(pdf.subarray(0,4).toString(),"%PDF");assert.equal(fetchCalls.length,3);assert.equal(fetchCalls[0].options.redirect,"error");assert.ok(fetchCalls.every(call=>call.url.startsWith("https://earthengine.googleapis.com/")));assert.ok(pdf.length>1000);assert.match(pdfText,/4d65616e204e44/);assert.match(pdfText,/20302e313530/);assert.equal((pdfText.match(/\/Subtype \/Image/g)||[]).length,6);
});

const reportAnalysis={id:"fallback-test",analysis_type:"vegetation",satellite_source:"sentinel-2",start_date:"2023-01-01",end_date:"2023-02-01",completed_at:"2024-02-02T00:00:00Z",geometry_json:{type:"Polygon",coordinates:[[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]]},result_json:{...mockResult,layers:[mockResult.layers[0]]}};

test("PDF tile timeout aborts and returns the safe unavailable result",async()=>{
 let requestOptions;const pending=(_url,options)=>{requestOptions=options;return new Promise((_resolve,reject)=>options.signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true}));};
 const preview=await loadMapPreview(mockResult.layers[0],reportAnalysis.geometry_json,pending,10);
 assert.equal(preview,null);assert.equal(requestOptions.redirect,"error");assert.equal(requestOptions.signal.aborted,true);
});

test("PDF tile streams stop as soon as the 2 MB limit is exceeded",async()=>{
 let cancelled=false;const oversized=Buffer.alloc(2_000_001),response=imageResponse([oversized],{onCancel:()=>{cancelled=true;}});
 assert.equal(await loadMapPreview(mockResult.layers[0],reportAnalysis.geometry_json,async()=>response),null);assert.equal(cancelled,true);
});

test("failed tile responses and redirects return the safe PDF fallback",async()=>{
 let failedBodyCancelled=false;const failed=imageResponse([],{ok:false,onCancel:()=>{failedBodyCancelled=true;}});
 assert.equal(await loadMapPreview(mockResult.layers[0],reportAnalysis.geometry_json,async()=>failed),null);assert.equal(failedBodyCancelled,true);
 assert.equal(await loadMapPreview(mockResult.layers[0],reportAnalysis.geometry_json,async()=>imageResponse([],{type:"text/html"})),null);
 let redirectMode;assert.equal(await loadMapPreview(mockResult.layers[0],reportAnalysis.geometry_json,async(_url,options)=>{redirectMode=options.redirect;throw new Error("redirect rejected");}),null);assert.equal(redirectMode,"error");
 class RecordingPdf{constructor(){this.messages=[];this.y=100;}fillColor(){return this;}fontSize(){return this;}text(value){this.messages.push(String(value));return this;}moveDown(){return this;}image(){return this;}addPage(){return this;}}
 const doc=new RecordingPdf();await writeAnalysisReport(doc,reportAnalysis,{fetchImpl:async()=>failed});assert.ok(doc.messages.includes("Current map imagery could not be retrieved. Rerun this analysis to refresh the map layer."));
});
