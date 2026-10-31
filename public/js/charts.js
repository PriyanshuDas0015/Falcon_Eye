let currentChart=null;
export function renderCharts(charts){
 const panel=document.querySelector("#chart-wrap"),canvas=document.querySelector("#analysis-chart");
 if(currentChart){currentChart.destroy();currentChart=null;}
 if(!Array.isArray(charts)||!charts.length||!window.Chart){panel.classList.add("hidden");return;}
 const chart=charts[0];const type=["doughnut","line"].includes(chart.type)?chart.type:"bar";
 const colors=["#2676a8","#397d49","#88b053","#7a87c6","#e49635","#dfc35a","#c4281b","#a59b8f","#b39fe1"];
 const datasets=(chart.series||[]).map((series,index)=>({label:series.unit?`${series.name} (${series.unit})`:series.name,data:series.data,backgroundColor:type==="doughnut"?colors:colors[index%colors.length],borderColor:colors[index%colors.length],borderWidth:type==="line"?2:1,tension:.25,fill:false}));
 if(!datasets.length){panel.classList.add("hidden");return;}
 panel.classList.remove("hidden");
 currentChart=new window.Chart(canvas,{type,data:{labels:chart.labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="doughnut"||datasets.length>1,position:"bottom",labels:{color:"#9ab6bd"}},title:{display:true,text:chart.title,color:"#d8e9ec"}},scales:["bar","line"].includes(type)?{x:{ticks:{color:"#78959e"},grid:{color:"#173744"}},y:{beginAtZero:type==="bar",ticks:{color:"#78959e"},grid:{color:"#173744"},title:{display:Boolean(chart.unit),text:chart.unit||"",color:"#9ab6bd"}}}:undefined}});
}
