import { getClient } from "../earth-engine/client.js";
import { datasets } from "../earth-engine/datasets.js";
import { getAnalysisType } from "./registry.js";

const lulcClasses=["water","trees","grass","flooded vegetation","crops","shrub / scrub","built","bare","snow / ice"];
const lulcPalette=["419BDF","397D49","88B053","7A87C6","E49635","DFC35A","C4281B","A59B8F","B39FE1"];
const evaluate=computed=>new Promise((resolve,reject)=>computed.evaluate((value,error)=>error?reject(new Error(String(error))):resolve(value)));
const getMap=(image,visParams)=>new Promise((resolve,reject)=>image.getMap(visParams,(map,error)=>error?reject(new Error(String(error))):resolve(map)));
const dateAfter=date=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
const geeFailure=error=>{const original=String(error?.message||error);const e=new Error(/no images|empty collection|no bands/i.test(original)?"No usable satellite imagery was found for the selected area and period.":"Google Earth Engine could not complete this analysis.");e.code=/no images|empty collection|no bands/i.test(original)?"NO_IMAGERY_AVAILABLE":"EARTH_ENGINE_ERROR";return e;};
function s2Collection(ee,geometry,start,end,cloudCover=30){
 const collection=ee.ImageCollection(datasets["sentinel-2"].id).filterBounds(geometry).filterDate(start,dateAfter(end)).filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE",cloudCover));
 return collection.map(image=>{const scl=image.select("SCL"),mask=scl.neq(0).and(scl.neq(1)).and(scl.neq(3)).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));return image.updateMask(mask);});
}
function s2Composite(ee,geometry,start,end,cloudCover=30){
 return s2Collection(ee,geometry,start,end,cloudCover).median();
}
function landsatComposite(ee,dataset,geometry,start,end,cloudCover=30){
 const source=datasets[dataset];const collection=ee.ImageCollection(source.id).filterBounds(geometry).filterDate(start,dateAfter(end)).filter(ee.Filter.lte("CLOUD_COVER",cloudCover));
 return collection.map(image=>{const qa=image.select("QA_PIXEL");const mask=qa.bitwiseAnd(1<<1).eq(0).and(qa.bitwiseAnd(1<<3).eq(0)).and(qa.bitwiseAnd(1<<4).eq(0)).and(qa.bitwiseAnd(1<<5).eq(0));return image.updateMask(mask).select(["SR_B3","SR_B4","SR_B5","SR_B6"],["green","red","nir","swir1"]).multiply(0.0000275).add(-0.2);}).median();
}
function getComposite(ee,dataset,geometry,start,end,cloudCover){
 if(dataset==="sentinel-2")return s2Composite(ee,geometry,start,end,cloudCover).select(["B3","B4","B8","B11"],["green","red","nir","swir1"]);
 if(dataset==="landsat-8"||dataset==="landsat-9")return landsatComposite(ee,dataset,geometry,start,end,cloudCover);
 throw Object.assign(new Error("The selected dataset has no configured optical composite."),{code:"UNSUPPORTED_DATASET"});
}
function indexImage(ee,image,numerator,denominator,name){const numeratorBand=image.select(numerator),denominatorBand=image.select(denominator),validDenominator=numeratorBand.add(denominatorBand).abs().gt(1e-6);return image.expression(`(${numerator} - ${denominator}) / (${numerator} + ${denominator})`,{[numerator]:numeratorBand,[denominator]:denominatorBand}).updateMask(validDenominator).rename(name);}
const MIN_VALID_PIXEL_COVERAGE_PERCENT=1;
async function vegetationComparison(ee,request,cloudCover){
 const {geometry,startDate,endDate,comparisonStartDate,comparisonEndDate}=request;
 if(!comparisonStartDate||!comparisonEndDate)throw Object.assign(new Error("Both vegetation comparison date ranges are required."),{code:"VALIDATION_ERROR"});
 if(request.dataset!=="sentinel-2")throw Object.assign(new Error("Two-period vegetation comparison requires Sentinel-2."),{code:"UNSUPPORTED_DATASET"});
 const aoi=ee.Geometry(geometry),period1=s2Collection(ee,aoi,startDate,endDate,cloudCover),period2=s2Collection(ee,aoi,comparisonStartDate,comparisonEndDate,cloudCover);
 const [imageCountPeriod1,imageCountPeriod2]=await Promise.all([evaluate(period1.size()),evaluate(period2.size())]);
 if(Number(imageCountPeriod1)===0)throw Object.assign(new Error("No Sentinel-2 images were found for Period 1."),{code:"NO_IMAGERY_AVAILABLE"});
 if(Number(imageCountPeriod2)===0)throw Object.assign(new Error("No Sentinel-2 images were found for Period 2."),{code:"NO_IMAGERY_AVAILABLE"});
 const composite1=period1.median().select(["B4","B8"],["red","nir"]),composite2=period2.median().select(["B4","B8"],["red","nir"]);
 const ndvi1=indexImage(ee,composite1,"nir","red","NDVI").clip(aoi),ndvi2=indexImage(ee,composite2,"nir","red","NDVI").clip(aoi);
 const commonMask=ndvi1.mask().and(ndvi2.mask()),ndvi1Common=ndvi1.updateMask(commonMask),ndvi2Common=ndvi2.updateMask(commonMask),difference=ndvi2Common.subtract(ndvi1Common).rename("NDVI_change");
 const scale=datasets["sentinel-2"].resolution,statsReducer=ee.Reducer.mean().combine({reducer2:ee.Reducer.minMax(),sharedInputs:true});
 const validArea=image=>ee.Image.pixelArea().updateMask(image.mask()).rename("valid_area").reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale,maxPixels:1e9,tileScale:4});
 const [stats1,stats2,changeStats,validArea1,validArea2,commonValidArea,aoiM2,map1,map2,mapDifference]=await Promise.all([
  evaluate(ndvi1.reduceRegion({reducer:statsReducer,geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(ndvi2.reduceRegion({reducer:statsReducer,geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(difference.reduceRegion({reducer:ee.Reducer.mean(),geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(validArea(ndvi1)),evaluate(validArea(ndvi2)),evaluate(validArea(difference)),evaluate(aoi.area(1)),
  getMap(ndvi1,{min:-1,max:1,palette:["8c2d04","d8b365","f6e8c3","a6dba0","1b7837"]}),
  getMap(ndvi2,{min:-1,max:1,palette:["8c2d04","d8b365","f6e8c3","a6dba0","1b7837"]}),
  getMap(difference,{min:-2,max:2,palette:["b2182b","f7f7f7","1a9850"]})
 ]);
 const coverage=area=>Number.isFinite(Number(aoiM2))&&Number(aoiM2)>0?Math.min(100,Number(area?.valid_area||0)/Number(aoiM2)*100):0;
 const coverage1=coverage(validArea1),coverage2=coverage(validArea2),commonCoverage=coverage(commonValidArea);
 const finite=(...values)=>values.every(value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value)));
 if(!finite(stats1?.NDVI_mean,stats1?.NDVI_min,stats1?.NDVI_max)||coverage1<MIN_VALID_PIXEL_COVERAGE_PERCENT||!finite(stats2?.NDVI_mean,stats2?.NDVI_min,stats2?.NDVI_max)||coverage2<MIN_VALID_PIXEL_COVERAGE_PERCENT||!finite(changeStats?.NDVI_change_mean)||commonCoverage<MIN_VALID_PIXEL_COVERAGE_PERCENT){
  throw Object.assign(new Error(`At least ${MIN_VALID_PIXEL_COVERAGE_PERCENT}% valid pixel coverage is required in both periods and their overlap.`),{code:"INSUFFICIENT_VALID_PIXELS"});
 }
 const period1Stats={meanNDVI:Number(stats1.NDVI_mean),minNDVI:Number(stats1.NDVI_min),maxNDVI:Number(stats1.NDVI_max),imageCount:Number(imageCountPeriod1),validPixelCoveragePercent:coverage1};
 const period2Stats={meanNDVI:Number(stats2.NDVI_mean),minNDVI:Number(stats2.NDVI_min),maxNDVI:Number(stats2.NDVI_max),imageCount:Number(imageCountPeriod2),validPixelCoveragePercent:coverage2};
 const comparisonStats={meanNDVIChange:Number(changeStats.NDVI_change_mean),commonValidPixelCoveragePercent:commonCoverage};
 const days=(start,end)=>Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000)+1,period1Days=days(startDate,endDate),period2Days=days(comparisonStartDate,comparisonEndDate),relativeDifference=(first,second)=>Math.max(first,second)>0?Math.abs(first-second)/Math.max(first,second):0,qualityWarnings=[];
 if(relativeDifference(period1Days,period2Days)>=0.1)qualityWarnings.push(`Observation periods differ in length (${period1Days} vs ${period2Days} days); compare equivalent seasonal windows when possible.`);
 if(relativeDifference(period1Stats.imageCount,period2Stats.imageCount)>=0.25)qualityWarnings.push(`Filtered Sentinel-2 image counts differ substantially (${period1Stats.imageCount} vs ${period2Stats.imageCount}); interpret change with observation availability in mind.`);
 if(Math.abs(coverage1-coverage2)>=10)qualityWarnings.push(`Valid-pixel coverage differs by ${Math.abs(coverage1-coverage2).toFixed(1)} percentage points; interpret the comparison carefully.`);
 const layers=[
  {id:"ndvi-period-1",name:"Period 1 NDVI",type:"tile",url:map1.urlFormat,opacity:0.8,legend:[{label:"−1.00 NDVI",value:-1,color:"8c2d04"},{label:"−0.50 NDVI",value:-0.5,color:"d8b365"},{label:"0.00 NDVI",value:0,color:"f6e8c3"},{label:"+0.50 NDVI",value:0.5,color:"a6dba0"},{label:"+1.00 NDVI",value:1,color:"1b7837"}]},
  {id:"ndvi-period-2",name:"Period 2 NDVI",type:"tile",url:map2.urlFormat,opacity:0.8,legend:[{label:"−1.00 NDVI",value:-1,color:"8c2d04"},{label:"−0.50 NDVI",value:-0.5,color:"d8b365"},{label:"0.00 NDVI",value:0,color:"f6e8c3"},{label:"+0.50 NDVI",value:0.5,color:"a6dba0"},{label:"+1.00 NDVI",value:1,color:"1b7837"}]},
  {id:"ndvi-change",name:"NDVI change (Period 2 − Period 1)",type:"tile",url:mapDifference.urlFormat,opacity:0.8,legend:[{label:"−2.00 NDVI change",value:-2,color:"b2182b"},{label:"0.00 NDVI change",value:0,color:"f7f7f7"},{label:"+2.00 NDVI change",value:2,color:"1a9850"}]}
 ];
 const statistics={period1:period1Stats,period2:period2Stats,comparison:comparisonStats,meanNDVIPeriod1:period1Stats.meanNDVI,minNDVIPeriod1:period1Stats.minNDVI,maxNDVIPeriod1:period1Stats.maxNDVI,imageCountPeriod1:period1Stats.imageCount,validPixelCoveragePeriod1Percent:coverage1,meanNDVIPeriod2:period2Stats.meanNDVI,minNDVIPeriod2:period2Stats.minNDVI,maxNDVIPeriod2:period2Stats.maxNDVI,imageCountPeriod2:period2Stats.imageCount,validPixelCoveragePeriod2Percent:coverage2,meanNDVIChangeCommonValidPixels:comparisonStats.meanNDVIChange,commonValidPixelCoveragePercent:commonCoverage};
 const charts=[{type:"bar",title:"Mean NDVI and common-pixel change",labels:["Period 1","Period 2","Mean change"],series:[{name:"NDVI",data:[period1Stats.meanNDVI,period2Stats.meanNDVI,comparisonStats.meanNDVIChange]}]}];
 return {analysisType:request.analysisType,status:"COMPLETED",dataset:{key:"sentinel-2",...datasets["sentinel-2"]},dateRange:{start:startDate,end:endDate},comparisonDateRange:{start:comparisonStartDate,end:comparisonEndDate},area:{aoiSqKm:Number(aoiM2)/1e6},statistics,qualityWarnings,layers,charts,methodology:{formula:"NDVI = (B8 − B4) / (B8 + B4); change = Period 2 NDVI − Period 1 NDVI",bands:{NIR:"B8",Red:"B4"},composite:"Median Sentinel-2 surface-reflectance composite after SCL masking",maskedSclClasses:[0,1,3,8,9,10,11],changeMask:"Difference and mean change use only pixels with valid NDVI in both periods",differenceVisualization:{min:-2,max:2,neutral:0,palette:["b2182b","f7f7f7","1a9850"]},comparisonQualityWarningRules:{durationMismatchRatio:.1,imageCountMismatchRatio:.25,coverageDifferencePercentagePoints:10},minimumValidPixelCoveragePercent:MIN_VALID_PIXEL_COVERAGE_PERCENT,cloudCoverFilterPercent:cloudCover,implementationVersion:"vegetation-comparison-v1"},metadata:{spatialResolutionM:scale,earthEngineDatasetId:datasets["sentinel-2"].id,analysisVersion:"vegetation-comparison-v1"}};
}
async function vegetation(ee,request){
 const {dataset,geometry,startDate,endDate,parameters={}}=request;const cloudCover=Number(parameters.cloudCover??30);const threshold=Number(parameters.vegetationThreshold??0.3);
 if(!Number.isFinite(cloudCover)||cloudCover<0||cloudCover>100||!Number.isFinite(threshold)||threshold< -1||threshold>1)throw Object.assign(new Error("Cloud cover must be 0–100 and the NDVI threshold must be −1 to 1."),{code:"VALIDATION_ERROR"});
 if(request.comparisonStartDate||request.comparisonEndDate)return await vegetationComparison(ee,request,cloudCover);
 const aoi=ee.Geometry(geometry),composite=getComposite(ee,dataset,aoi,startDate,endDate,cloudCover),ndvi=indexImage(ee,composite,"nir","red","NDVI").clip(aoi),scale=datasets[dataset].resolution;
 const reducer=ee.Reducer.mean().combine({reducer2:ee.Reducer.median(),sharedInputs:true}).combine({reducer2:ee.Reducer.minMax(),sharedInputs:true});
 const [stats,areaM2,histogram,aoiM2,map]=await Promise.all([
  evaluate(ndvi.reduceRegion({reducer,geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(ee.Image.pixelArea().updateMask(ndvi.gte(threshold)).rename("area").reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(ndvi.reduceRegion({reducer:ee.Reducer.fixedHistogram(-1,1,20),geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(aoi.area(1)),
  getMap(ndvi,{min:-1,max:1,palette:["8c2d04","d8b365","f6e8c3","a6dba0","1b7837"]})
 ]);
 if(!Number.isFinite(Number(stats?.NDVI_mean)))throw Object.assign(new Error("No usable vegetation observations were found for the selected area and period."),{code:"NO_IMAGERY_AVAILABLE"});
 const hist=histogram?.NDVI||[];const chart=hist.length?{id:"ndvi-distribution",type:"bar",title:"NDVI distribution",labels:hist.map(bin=>Number(bin[0]).toFixed(2)),series:[{name:"Pixel count",data:hist.map(bin=>Number(bin.at(-1)))}]}:null;
 let vigorDistribution=[];const low=Number(parameters.lowVigorThreshold??0.3),high=Number(parameters.highVigorThreshold??0.6);
 if(request.analysisType==="crop-health"){
  if(!Number.isFinite(low)||!Number.isFinite(high)||low< -1||high>1||low>=high)throw Object.assign(new Error("Vigor thresholds must be between −1 and 1, with the low threshold below the high threshold."),{code:"VALIDATION_ERROR"});
  const vigorClass=ndvi.lt(low).multiply(1).where(ndvi.gte(low).and(ndvi.lt(high)),2).where(ndvi.gte(high),3).rename("class");
  const grouped=await evaluate(ee.Image.pixelArea().rename("area").addBands(vigorClass).reduceRegion({reducer:ee.Reducer.sum().group({groupField:1,groupName:"class"}),geometry:aoi,scale,maxPixels:1e9,tileScale:4}));
  vigorDistribution=(grouped?.groups||[]).map(group=>({classId:Number(group.class),name:["","Low Vegetation Vigor","Moderate Vegetation Vigor","High Vegetation Vigor"][Number(group.class)],areaSqKm:Number(group.sum)/1e6,percentage:Number(group.sum)/Number(aoiM2)*100}));
 }
 const result={analysisType:request.analysisType,status:"COMPLETED",dataset:{key:dataset,...datasets[dataset]},dateRange:{start:startDate,end:endDate},area:{aoiSqKm:Number(aoiM2)/1e6,vegetationSqKm:Number(areaM2?.area||0)/1e6,threshold},statistics:{meanNDVI:Number(stats?.NDVI_mean),medianNDVI:Number(stats?.NDVI_median),minNDVI:Number(stats?.NDVI_min),maxNDVI:Number(stats?.NDVI_max),...(request.analysisType==="crop-health"?{vigorDistribution}:{})},layers:[{id:"ndvi",name:"NDVI",type:"tile",url:map.urlFormat,opacity:0.8,legend:[{label:"Low vigor",color:"8c2d04"},{label:"Moderate vigor",color:"f6e8c3"},{label:"High vigor",color:"1b7837"}]}],charts:chart?[chart]:[],methodology:{formula:"(NIR − Red) / (NIR + Red)",bands:dataset==="sentinel-2"?{NIR:"B8",Red:"B4"}:{NIR:"SR_B5",Red:"SR_B4"},composite:"Per-pixel median of cloud/shadow-masked surface reflectance",cloudCoverFilterPercent:cloudCover,vegetationThreshold:threshold,...(request.analysisType==="crop-health"?{vigorClassThresholds:{low,high},vigorNote:"Configurable NDVI vigor heuristics; not crop-specific diagnosis."}:{}),implementationVersion:getAnalysisType(request.analysisType).version},metadata:{spatialResolutionM:scale,earthEngineDatasetId:datasets[dataset].id,analysisVersion:getAnalysisType(request.analysisType).version}};
 return result;
}
async function water(ee,request){
 const {dataset,geometry,startDate,endDate,parameters={}}=request;const threshold=Number(parameters.waterThreshold??0.1);const cloudCover=Number(parameters.cloudCover??30);
 if(!Number.isFinite(threshold)||threshold< -1||threshold>1||!Number.isFinite(cloudCover)||cloudCover<0||cloudCover>100)throw Object.assign(new Error("Water threshold must be −1 to 1 and cloud cover 0–100."),{code:"VALIDATION_ERROR"});
 const aoi=ee.Geometry(geometry),composite=getComposite(ee,dataset,aoi,startDate,endDate,cloudCover),mndwi=dataset==="sentinel-2"||dataset.startsWith("landsat-");
 const green="green",waterIndex=indexImage(ee,composite,green,mndwi?"swir1":"nir",mndwi?"MNDWI":"NDWI").clip(aoi),scale=datasets[dataset].resolution;
 const [stats,areaM2,aoiM2,map]=await Promise.all([
  evaluate(waterIndex.reduceRegion({reducer:ee.Reducer.mean().combine({reducer2:ee.Reducer.median(),sharedInputs:true}).combine({reducer2:ee.Reducer.minMax(),sharedInputs:true}),geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(ee.Image.pixelArea().updateMask(waterIndex.gt(threshold)).rename("area").reduceRegion({reducer:ee.Reducer.sum(),geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(aoi.area(1)),
  getMap(waterIndex.updateMask(waterIndex.gt(threshold)),{min:threshold,max:1,palette:["b7d9e8","2676a8"]})
 ]);
 if(!Number.isFinite(Number(stats?.[`${mndwi?"MNDWI":"NDWI"}_mean`])))throw Object.assign(new Error("No usable water-index observations were found for the selected area and period."),{code:"NO_IMAGERY_AVAILABLE"});
 return {analysisType:request.analysisType,status:"COMPLETED",dataset:{key:dataset,...datasets[dataset]},dateRange:{start:startDate,end:endDate},area:{aoiSqKm:Number(aoiM2)/1e6,estimatedWaterSqKm:Number(areaM2?.area||0)/1e6,threshold},statistics:{index:mndwi?"MNDWI":"NDWI",mean:Number(stats?.[`${mndwi?"MNDWI":"NDWI"}_mean`]),median:Number(stats?.[`${mndwi?"MNDWI":"NDWI"}_median`]),min:Number(stats?.[`${mndwi?"MNDWI":"NDWI"}_min`]),max:Number(stats?.[`${mndwi?"MNDWI":"NDWI"}_max`])},layers:[{id:"water-index",name:mndwi?"MNDWI water mask":"NDWI water mask",type:"tile",url:map.urlFormat,opacity:0.8,legend:[{label:"Potential water",color:"2676a8"}]}],charts:[],methodology:{formula:mndwi?"(Green − SWIR1) / (Green + SWIR1)":"(Green − NIR) / (Green + NIR)",bands:mndwi?{Green:dataset==="sentinel-2"?"B3":"SR_B3",SWIR1:dataset==="sentinel-2"?"B11":"SR_B6"}:{Green:"B3",NIR:"B8"},composite:"Per-pixel median of cloud/shadow-masked surface reflectance",cloudCoverFilterPercent:cloudCover,waterThreshold:threshold,interpretation:"Estimated water extent from a configurable spectral-index threshold; not a confirmed flood classification.",implementationVersion:getAnalysisType(request.analysisType).version},metadata:{spatialResolutionM:datasets[dataset].resolution,earthEngineDatasetId:datasets[dataset].id,analysisVersion:getAnalysisType(request.analysisType).version}};
}
async function landUse(ee,request){
 const {geometry,startDate,endDate}=request;const aoi=ee.Geometry(geometry),collection=ee.ImageCollection(datasets["dynamic-world"].id).filterBounds(aoi).filterDate(startDate,dateAfter(endDate)),image=collection.select("label").mode().clip(aoi),scale=10;
 const areaAndClass=ee.Image.pixelArea().rename("area").addBands(image.rename("class"));const [grouped,aoiM2,map]=await Promise.all([
  evaluate(areaAndClass.reduceRegion({reducer:ee.Reducer.sum().group({groupField:1,groupName:"class"}),geometry:aoi,scale,maxPixels:1e9,tileScale:4})),
  evaluate(aoi.area(1)),
  getMap(image,{min:0,max:8,palette:lulcPalette})
 ]);
 const groups=grouped?.groups||[];if(!groups.length)throw Object.assign(new Error("No usable land-cover observations were found for the selected area and period."),{code:"NO_IMAGERY_AVAILABLE"});
 const areas=groups.map(g=>({classId:Number(g.class),name:lulcClasses[Number(g.class)]||"Unknown",areaSqKm:Number(g.sum)/1e6,percentage:Number(g.sum)/Number(aoiM2)*100}));
 return {analysisType:request.analysisType,status:"COMPLETED",dataset:{key:"dynamic-world",...datasets["dynamic-world"]},dateRange:{start:startDate,end:endDate},area:{aoiSqKm:Number(aoiM2)/1e6},statistics:{classCount:areas.length,classes:areas},layers:[{id:"land-cover",name:"Dynamic World land-cover classes",type:"tile",url:map.urlFormat,opacity:0.85,legend:lulcClasses.map((label,i)=>({label,color:lulcPalette[i]}))}],charts:[{id:"land-cover-area",type:"doughnut",title:"Estimated area by class",labels:areas.map(x=>x.name),series:[{name:"Area (km²)",data:areas.map(x=>x.areaSqKm)}]}],methodology:{composite:"Per-pixel modal class over the selected observation period",classificationSource:"Dynamic World label band; class probabilities are not treated as certainty",implementationVersion:getAnalysisType(request.analysisType).version},metadata:{spatialResolutionM:10,earthEngineDatasetId:datasets["dynamic-world"].id,analysisVersion:getAnalysisType(request.analysisType).version}};
}
export async function runEarthEngineAnalysis(request,eeClient=getClient()){
 const ee=eeClient;
 try{if(request.analysisType==="vegetation"||request.analysisType==="crop-health")return await vegetation(ee,request);if(request.analysisType==="water")return await water(ee,request);if(request.analysisType==="land-use")return await landUse(ee,request);throw Object.assign(new Error("This analysis processor is not implemented."),{code:"ANALYSIS_NOT_AVAILABLE"});}catch(error){if(error.code)throw error;throw geeFailure(error);}
}
