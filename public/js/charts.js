let currentChart=null;
export function renderCharts(charts,{panel=document.querySelector("#chart-wrap"),canvas=document.querySelector("#analysis-chart"),ChartClass=window.Chart}={}){
 if(currentChart){currentChart.destroy();currentChart=null;}
 if(!Array.isArray(charts)||!charts.length||!ChartClass){panel.classList.add("hidden");return;}
 const chart=charts.find(item=>item&&typeof item==="object"&&Array.isArray(item.labels)&&item.labels.length&&Array.isArray(item.series));
 if(!chart){panel.classList.add("hidden");return;}
 const labels=chart.labels.map((label,index)=>typeof label==="string"||typeof label==="number"?String(label):`Item ${index+1}`),type=["doughnut","line"].includes(chart.type)?chart.type:"bar";
 const colors=["#2676a8","#397d49","#88b053","#7a87c6","#e49635","#dfc35a","#c4281b","#a59b8f","#b39fe1"];
 const datasets=chart.series.filter(series=>series&&typeof series==="object"&&Array.isArray(series.data)).map((series,index)=>({series,index})).filter(({series})=>series.data.some(value=>typeof value==="number"&&Number.isFinite(value))).map(({series,index})=>{const color=colors[index%colors.length],name=typeof series.name==="string"&&series.name.trim()?series.name.trim():`Series ${index+1}`,unit=typeof series.unit==="string"&&series.unit.trim()?` (${series.unit.trim()})`:"",data=labels.map((_,point)=>{const value=series.data[point];return typeof value==="number"&&Number.isFinite(value)?value:null;});return{label:`${name}${unit}`,data,backgroundColor:type==="doughnut"?color:color,borderColor:color,borderWidth:type==="line"?2:1,tension:.25,fill:false};});
 if(!datasets.length){panel.classList.add("hidden");return;}
 panel.classList.remove("hidden");
 const title=typeof chart.title==="string"&&chart.title.trim()?chart.title.trim():"Analysis comparison";
 currentChart=new ChartClass(canvas,{type,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="doughnut"||datasets.length>1,position:"bottom",labels:{color:"#9ab6bd"}},title:{display:true,text:title,color:"#d8e9ec"}},scales:["bar","line"].includes(type)?{x:{ticks:{color:"#78959e"},grid:{color:"#173744"}},y:{beginAtZero:type==="bar",ticks:{color:"#78959e"},grid:{color:"#173744"},title:{display:Boolean(chart.unit),text:typeof chart.unit==="string"?chart.unit:"",color:"#9ab6bd"}}}:undefined}});
}
