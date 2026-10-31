import test from "node:test";
import assert from "node:assert/strict";
import {analysisTypes,getAnalysisType} from "../src/services/analysis/registry.js";
import {datasets} from "../src/services/earth-engine/datasets.js";
test("analysis registry exposes every requested logical analysis",()=>{for(const id of ["vegetation","crop-health","deforestation","water","flood","urban-growth","fire","land-use","construction-change","buildings","roads","environment"])assert.ok(getAnalysisType(id),id);});
test("unsupported infrastructure analysis is explicitly planned",()=>{assert.equal(getAnalysisType("roads").status,"PLANNED");assert.equal(getAnalysisType("buildings").status,"PLANNED");assert.ok(analysisTypes.length>=12);});
test("dataset identifiers are centralized",()=>{assert.equal(datasets["sentinel-2"].id,"COPERNICUS/S2_SR_HARMONIZED");assert.equal(datasets["sentinel-1"].id,"COPERNICUS/S1_GRD");});
test("analysis processors requiring Earth Engine are explicitly listed",()=>{assert.equal(getAnalysisType("vegetation").status,"REQUIRES_EARTH_ENGINE");assert.equal(getAnalysisType("water").status,"REQUIRES_EARTH_ENGINE");assert.equal(getAnalysisType("flood").status,"PLANNED");});
