const comparisonMetricGroups=[
 {key:"period1",title:"Period 1",fields:[["Mean NDVI","meanNDVI","ndvi"],["Minimum NDVI","minNDVI","ndvi"],["Maximum NDVI","maxNDVI","ndvi"],["Valid-pixel coverage","validPixelCoveragePercent","percent"],["Images in composite","imageCount","count"]]},
 {key:"period2",title:"Period 2",fields:[["Mean NDVI","meanNDVI","ndvi"],["Minimum NDVI","minNDVI","ndvi"],["Maximum NDVI","maxNDVI","ndvi"],["Valid-pixel coverage","validPixelCoveragePercent","percent"],["Images in composite","imageCount","count"]]},
 {key:"comparison",title:"Common-pixel comparison",fields:[["Mean NDVI change","meanNDVIChange","change"],["Common valid-pixel coverage","commonValidPixelCoveragePercent","percent"]]}
];
const isRecord=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);

function metricValue(value,format){
 if(typeof value!=="number"||!Number.isFinite(value))return null;
 if(format==="percent")return `${value.toFixed(1)}%`;
 if(format==="count")return String(Math.round(value));
 if(format==="area")return `${value.toFixed(2)} km²`;
 if(format==="change")return `${value>0?"+":""}${value.toFixed(3)} NDVI`;
 return value.toFixed(3);
}

function addMetric(document,host,label,value,format){
 const formatted=metricValue(value,format);if(formatted===null)return;
 const card=document.createElement("div");card.className="result-stat";
 const title=document.createElement("span");title.textContent=label;
 const output=document.createElement("b");output.textContent=formatted;
 card.append(title,output);host.append(card);
}

function renderStatistics(document,host,result){
 host.replaceChildren();const statistics=isRecord(result.statistics)?result.statistics:{};
 const warnings=Array.isArray(result.qualityWarnings)?result.qualityWarnings.filter(value=>typeof value==="string"&&value.trim()):[];
 if(warnings.length){const notice=document.createElement("div");notice.className="notice warning result-quality-warning";notice.textContent=warnings.join(" ");host.append(notice);}
 if(isRecord(statistics.period1)&&isRecord(statistics.period2)&&isRecord(statistics.comparison)){
  const groups=document.createElement("div");groups.className="result-stat-groups";
  for(const groupData of comparisonMetricGroups){
   const values=isRecord(statistics[groupData.key])?statistics[groupData.key]:{},group=document.createElement("section");group.className="result-stat-group";
   const heading=document.createElement("h3");heading.textContent=groupData.title;group.append(heading);
   const cards=document.createElement("div");cards.className="result-stat-group-cards";
   for(const[label,key,format]of groupData.fields)addMetric(document,cards,label,values[key],format);
   group.append(cards);groups.append(group);
  }
  const areaValue=metricValue(isRecord(result.area)?result.area.aoiSqKm:null,"area");
  if(areaValue!==null){const area=document.createElement("div");area.className="result-stat-area";area.textContent=`Area of Interest: ${areaValue}`;groups.append(area);}
  host.append(groups);return;
 }
 const cards=document.createElement("div"),area=isRecord(result.area)?result.area:{};cards.className="result-stat-group-cards";
 for(const[key,value]of Object.entries({...area,...statistics}))addMetric(document,cards,key.replaceAll(/([A-Z])/g," $1"),value,key.toLowerCase().includes("sqkm")?"area":"ndvi");
 host.append(cards);
}

function renderLegend(document,host,layer){
 const items=Array.isArray(layer?.legend)?layer.legend.filter(item=>isRecord(item)&&typeof item.color==="string"&&typeof item.label==="string"):[];
 host.replaceChildren(...items.map(item=>{const entry=document.createElement("span");entry.className="legend-item";const swatch=document.createElement("i");swatch.className="legend-swatch";swatch.style.backgroundColor=`#${item.color}`;const label=document.createElement("span");label.textContent=item.label;entry.append(swatch,label);return entry;}));
}

export function createResultsDashboard({document,map,leaflet}){
 const select=document.querySelector("#result-layer-select"),visibility=document.querySelector("#layer-visible"),opacity=document.querySelector("#layer-opacity"),legend=document.querySelector("#result-legend"),stats=document.querySelector("#result-stats"),status=document.querySelector("#result-map-status");
 let currentResult=null,activeLayer=null,selectedLayer=null,layerVisible=true;
 function setStatus(message=""){status.textContent=message;status.hidden=!message;}
 function selectLayer(id){
  if(activeLayer)map.removeLayer(activeLayer);
  const layers=Array.isArray(currentResult?.layers)?currentResult.layers:[],layer=layers.find(item=>item?.id===id&&item.type==="tile"&&typeof item.url==="string");
  selectedLayer=layer||null;activeLayer=null;renderLegend(document,legend,selectedLayer);setStatus("");
  if(!layer)return;
  activeLayer=leaflet.tileLayer(layer.url,{opacity:Number(opacity.value||layer.opacity||0.8),attribution:"Google Earth Engine"});
  const thisLayer=activeLayer;
  thisLayer.on?.("tileerror",()=>{if(activeLayer===thisLayer)setStatus("Map tiles are unavailable or expired. Rerun the analysis to refresh this layer.");});
  thisLayer.on?.("tileload",()=>{if(activeLayer===thisLayer)setStatus("");});
  if(layerVisible)activeLayer.addTo(map);
  opacity.value=String(layer.opacity??0.8);
 }
 function render(result){
  clear();if(!isRecord(result)){setStatus("This stored result is incomplete and cannot be displayed.");return;}currentResult=result;renderStatistics(document,stats,result);
  const layers=(Array.isArray(result.layers)?result.layers:[]).filter(layer=>isRecord(layer)&&typeof layer.id==="string"&&layer.type==="tile"&&typeof layer.url==="string");
  select.replaceChildren(...layers.map(layer=>{const option=document.createElement("option");option.value=layer.id;option.textContent=typeof layer.name==="string"?layer.name:layer.id;return option;}));
  select.hidden=layers.length<2;visibility.disabled=!layers.length;visibility.checked=true;layerVisible=true;
  if(layers.length){select.value=layers[0].id;selectLayer(layers[0].id);}else setStatus("No valid map layers are available for this stored result.");
 }
 function setVisible(visible){layerVisible=Boolean(visible);if(!activeLayer)return;if(layerVisible)activeLayer.addTo(map);else map.removeLayer(activeLayer);}
 function setOpacity(value){if(activeLayer)activeLayer.setOpacity(Number(value));}
 function clear(){if(activeLayer&&map)map.removeLayer(activeLayer);activeLayer=null;selectedLayer=null;currentResult=null;select.replaceChildren();select.hidden=true;visibility.checked=true;visibility.disabled=true;renderLegend(document,legend,null);stats.replaceChildren();setStatus("");}
 select.addEventListener("change",()=>selectLayer(select.value));
 visibility.addEventListener("change",event=>setVisible(event.target.checked));
 opacity.addEventListener("input",event=>setOpacity(event.target.value));
 return {render,clear,selectLayer,setVisible,setOpacity,getSelectedLayer:()=>selectedLayer};
}
