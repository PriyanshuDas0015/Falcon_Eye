import { URL } from "node:url";
import { clearTimeout as clearTimer } from "node:timers";
import { getAnalysisType } from "../services/analysis/registry.js";

const MAX_TILE_BYTES=2_000_000,TILE_REQUEST_TIMEOUT_MS=8_000;

function coordinatesOf(geometry){
 const points=[];
 function visit(value){
  if(Array.isArray(value)&&value.length>=2&&Number.isFinite(value[0])&&Number.isFinite(value[1]))points.push(value);
  else if(Array.isArray(value))value.forEach(visit);
 }
 visit(geometry?.coordinates);
 return points;
}
function representativeTileUrl(layer,geometry){
 const points=coordinatesOf(geometry);
 if(!points.length||typeof layer?.url!=="string")return null;
 const lons=points.map(point=>point[0]),lats=points.map(point=>point[1]);
 const lon=(Math.min(...lons)+Math.max(...lons))/2,lat=Math.max(-85.05112878,Math.min(85.05112878,(Math.min(...lats)+Math.max(...lats))/2)),zoom=8,n=2**zoom;
 const x=Math.floor((lon+180)/360*n),rad=lat*Math.PI/180,y=Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n);
 const url=layer.url.replaceAll("{z}",String(zoom)).replaceAll("{x}",String(x)).replaceAll("{y}",String(y));
 try{const parsed=new URL(url);if(parsed.protocol!=="https:"||parsed.hostname!=="earthengine.googleapis.com")return null;return parsed.href;}catch{return null;}
}

function cancelBody(body){
 try{const cancellation=body?.cancel?.();cancellation?.catch?.(()=>{});}catch{}
}

export async function loadMapPreview(layer,geometry,fetchImpl=fetch,timeoutMs=TILE_REQUEST_TIMEOUT_MS){
 const url=representativeTileUrl(layer,geometry);
 if(!url)return null;
 const controller=new globalThis.AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl(url,{redirect:"error",signal:controller.signal});
  const contentType=response.headers.get("content-type")||"";
  if(!response.ok||!/^image\/(png|jpeg)$/.test(contentType)){cancelBody(response.body);return null;}
  const contentLength=Number(response.headers.get("content-length"));
  if(Number.isFinite(contentLength)&&contentLength>MAX_TILE_BYTES){cancelBody(response.body);return null;}
  const reader=response.body?.getReader?.();
  if(!reader)return null;
  const chunks=[];let size=0;
  while(true){
   const{done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>MAX_TILE_BYTES){cancelBody(reader);return null;}
   chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks,size);
 }catch{return null;}finally{clearTimer(timer);}
}

function format(value,digits=3){return typeof value==="number"&&Number.isFinite(value)?value.toFixed(digits):"Not available";}
function writeComparisonStatistics(doc,statistics){
 const groups=[["Period 1",statistics.period1],["Period 2",statistics.period2]];
 for(const[title,values]of groups){
  doc.moveDown(.4).fontSize(12).fillColor("#1f5a45").text(title);
  for(const[label,value,kind]of[["Mean NDVI",values?.meanNDVI,"ndvi"],["Minimum NDVI",values?.minNDVI,"ndvi"],["Maximum NDVI",values?.maxNDVI,"ndvi"],["Valid-pixel coverage",values?.validPixelCoveragePercent,"percent"],["Image count",values?.imageCount,"count"]]){
   const text=kind==="percent"?`${format(value,1)}%`:kind==="count"?(typeof value==="number"&&Number.isFinite(value)?String(Math.round(value)):"Not available"):format(value);
   doc.fontSize(9).fillColor("#24332b").text(`${label}: ${text}`);
  }
 }
 const comparison=statistics.comparison||{};
 doc.moveDown(.4).fontSize(12).fillColor("#1f5a45").text("Common-pixel comparison").fontSize(9).fillColor("#24332b").text(`Mean NDVI change (Period 2 − Period 1): ${format(comparison.meanNDVIChange)}`).text(`Common valid-pixel coverage: ${format(comparison.commonValidPixelCoveragePercent,1)}%`);
}

export async function writeAnalysisReport(doc,analysis,{fetchImpl=fetch,tileTimeoutMs=TILE_REQUEST_TIMEOUT_MS}={}){
 const result=analysis.result_json||{},statistics=result.statistics||{};
 doc.fillColor("#1f5a45").fontSize(24).text("FALCON EYE").fillColor("#24332b").fontSize(11).text("Satellite Intelligence & Environmental Monitoring Platform").moveDown().fontSize(16).text("Scientific Analysis Report").moveDown(.5).fontSize(10);
 const start=result.dateRange?.start||new Date(analysis.start_date).toISOString().slice(0,10),end=result.dateRange?.end||new Date(analysis.end_date).toISOString().slice(0,10),comparison=result.comparisonDateRange;
 for(const[label,value]of[["Report ID",analysis.id], ["Analysis type",getAnalysisType(analysis.analysis_type)?.name||analysis.analysis_type], ["Dataset",result.dataset?.name||analysis.satellite_source], ["Period 1",`${start} to ${end}`], ...(comparison?[["Period 2",`${comparison.start} to ${comparison.end}`]]:[]), ["Processing date",new Date(analysis.completed_at).toISOString()]])doc.fillColor("#68766e").text(`${label}:`,{continued:true}).fillColor("#24332b").text(` ${value}`);
 doc.moveDown().fontSize(14).text("Measured results");
 if(statistics.period1&&statistics.period2&&statistics.comparison)writeComparisonStatistics(doc,statistics);
 else doc.fontSize(9).text(JSON.stringify(statistics,null,2));
 const warnings=Array.isArray(result.qualityWarnings)?result.qualityWarnings.filter(value=>typeof value==="string"&&value.trim()):[];
 if(warnings.length)doc.moveDown().fontSize(12).fillColor("#8a642e").text("Comparison quality notes").fontSize(9).fillColor("#24332b").text(warnings.join("\n"));
 doc.moveDown().fontSize(14).text("Map layer previews").fontSize(9).text("Representative Earth Engine tiles at the center of the selected area; colors follow each layer legend.");
 const layers=(result.layers||[]).filter(layer=>layer.type==="tile");
 if(!layers.length)doc.text("No map layers were included in this analysis result.");
 const previews=await Promise.all(layers.map(layer=>loadMapPreview(layer,analysis.geometry_json,fetchImpl,tileTimeoutMs)));
 for(const[index,layer]of layers.entries()){
  const image=previews[index];
  doc.moveDown(.5).fontSize(11).fillColor("#1f5a45").text(layer.name||layer.id).fillColor("#24332b");
  if(image){if(doc.y>620)doc.addPage();doc.image(image,{fit:[420,180],align:"center"}).moveDown(.3);}
  else doc.fontSize(9).text("Current map imagery could not be retrieved. Rerun this analysis to refresh the map layer.");
  if(layer.legend?.length)doc.fontSize(8).text(`Legend: ${layer.legend.map(item=>item.label).join(" · ")}`);
 }
 doc.moveDown().fontSize(14).text("Methodology").fontSize(9).text(JSON.stringify(result.methodology||{},null,2)).moveDown().fontSize(14).text("Area of Interest").fontSize(8).text(JSON.stringify(analysis.geometry_json)).moveDown().fontSize(14).text("Limitations").fontSize(9).text("Results depend on spatial resolution, cloud and atmospheric conditions, data coverage, selected dates, configured thresholds, and method assumptions. Field verification is recommended. Falcon Eye is not an emergency authority.");
}
