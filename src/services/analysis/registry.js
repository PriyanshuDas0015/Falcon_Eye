const ee = ["vegetation","crop-health","water","land-use"];
const deferred="Processing workflow is planned but not implemented; no result will be generated.";
export const analysisTypes = [
 {id:"vegetation",name:"Vegetation Analysis",category:"Vegetation & Agriculture",description:"NDVI-based vegetation-vigor summary.",status:"REQUIRES_EARTH_ENGINE",supportedDatasets:["sentinel-2","landsat-8","landsat-9"],requiresComparisonPeriod:false,version:"vegetation-v1"},
 {id:"crop-health",name:"Crop Vigor",category:"Vegetation & Agriculture",description:"NDVI vigor indicators; not a crop-yield or disease diagnosis.",status:"REQUIRES_EARTH_ENGINE",supportedDatasets:["sentinel-2"],requiresComparisonPeriod:false,version:"crop-health-v1"},
 {id:"deforestation",name:"Deforestation",category:"Vegetation & Agriculture",description:`${deferred} A validated temporal tree-cover method is required.`,status:"PLANNED",supportedDatasets:["sentinel-2","dynamic-world"],requiresComparisonPeriod:true,version:"deforestation-v1"},
 {id:"water",name:"Water Monitoring",category:"Water & Disaster",description:"Spectral water index and estimated water extent.",status:"REQUIRES_EARTH_ENGINE",supportedDatasets:["sentinel-2","landsat-8","landsat-9"],requiresComparisonPeriod:false,version:"water-v1"},
 {id:"flood",name:"Flood Detection",category:"Water & Disaster",description:`${deferred} A validated pre/post radar workflow is required.`,status:"PLANNED",supportedDatasets:["sentinel-1"],requiresComparisonPeriod:true,version:"flood-v1"},
 {id:"fire",name:"Burned Area / Forest Fire",category:"Water & Disaster",description:`${deferred} A validated pre/post NBR workflow is required.`,status:"PLANNED",supportedDatasets:["sentinel-2","landsat-8","landsat-9"],requiresComparisonPeriod:true,version:"fire-v1"},
 {id:"urban-growth",name:"Urban Growth",category:"Urban & Land",description:`${deferred} A validated temporal built-up workflow is required.`,status:"PLANNED",supportedDatasets:["dynamic-world","sentinel-2"],requiresComparisonPeriod:true,version:"urban-growth-v1"},
 {id:"land-use",name:"Land-Use / Land-Cover",category:"Urban & Land",description:"Dynamic World land-cover class distribution.",status:"REQUIRES_EARTH_ENGINE",supportedDatasets:["dynamic-world"],requiresComparisonPeriod:false,version:"lulc-v1"},
 {id:"construction-change",name:"New Construction",category:"Urban & Land",description:`${deferred} This would report area-level built-up change, not individual buildings.`,status:"PLANNED",supportedDatasets:["dynamic-world","sentinel-2"],requiresComparisonPeriod:true,version:"construction-change-v1"},
 {id:"buildings",name:"Building Detection",category:"Infrastructure",description:"No validated footprint model or configured dataset is available.",status:"PLANNED",supportedDatasets:[],requiresComparisonPeriod:false,version:"buildings-v1"},
 {id:"roads",name:"Road Detection",category:"Infrastructure",description:"No validated road model or configured dataset is available.",status:"PLANNED",supportedDatasets:[],requiresComparisonPeriod:false,version:"roads-v1"},
 {id:"environment",name:"Environmental Monitoring",category:"Combined",description:`${deferred} No arbitrary combined risk score is produced.`,status:"PLANNED",supportedDatasets:["sentinel-2","dynamic-world"],requiresComparisonPeriod:false,version:"environment-v1"}
];
export const getAnalysisType = id => analysisTypes.find(t => t.id === id);
export const requiresEarthEngine = id => ee.includes(id);
