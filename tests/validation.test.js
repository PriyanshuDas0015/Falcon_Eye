import test from "node:test";
import assert from "node:assert/strict";
import {normalizedEmail,validDate,validPassword,validUuid,validateAnalysisInput} from "../src/utils/validation.js";

test("account input helpers normalize and validate sensitive fields",()=>{
 assert.equal(normalizedEmail("  Researcher@Example.COM "),"researcher@example.com");
 assert.equal(validPassword("long-enough-password"),true);assert.equal(validPassword("short"),false);
 assert.equal(validUuid("a3bb189e-8bf9-4c09-9a1d-0b86b93f343d"),true);assert.equal(validUuid("not-an-id"),false);
});

test("date validation rejects impossible dates and equal analysis ranges",()=>{
 assert.equal(validDate("2026-02-29"),false);assert.equal(validDate("2024-02-29"),true);
 const result=validateAnalysisInput({analysisType:"vegetation",dataset:"sentinel-2",startDate:"2026-01-01",endDate:"2026-01-01",parameters:{}});
 assert.ok(result.details.dateRange);
});

test("vegetation comparison requires two ordered non-future Sentinel-2 periods",()=>{
 const base={analysisType:"vegetation",dataset:"sentinel-2",geometry:{type:"Polygon",coordinates:[]},startDate:"2025-01-01",endDate:"2025-01-31",comparisonStartDate:"2025-06-01",comparisonEndDate:"2025-06-30"};
 assert.deepEqual(validateAnalysisInput(base).details,{});
 assert.ok(validateAnalysisInput({...base,comparisonStartDate:undefined,comparisonEndDate:undefined}).details.comparisonDateRange);
 assert.ok(validateAnalysisInput({...base,startDate:"2025-02-01",endDate:"2025-01-31"}).details.dateRange);
 assert.ok(validateAnalysisInput({...base,endDate:"2025-06-01"}).details.comparisonDateRange);
 assert.ok(validateAnalysisInput({...base,startDate:"2025-06-01",endDate:"2025-06-30",comparisonStartDate:"2025-01-01",comparisonEndDate:"2025-02-01"}).details.comparisonDateRange);
 assert.ok(validateAnalysisInput({...base,endDate:"2025-02-30"}).details.dateRange);
 assert.ok(validateAnalysisInput({...base,comparisonStartDate:"2025-07-01",comparisonEndDate:"2025-06-30"}).details.comparisonDateRange);
 assert.ok(validateAnalysisInput({...base,comparisonEndDate:"2025-02-30"}).details.comparisonDateRange);
 const future=new Date();future.setUTCDate(future.getUTCDate()+1);const futureDate=future.toISOString().slice(0,10);
 assert.ok(validateAnalysisInput({...base,comparisonStartDate:futureDate,comparisonEndDate:futureDate}).details.comparisonDateRange);
 assert.ok(validateAnalysisInput({...base,startDate:futureDate,endDate:futureDate}).details.dateRange);
 assert.ok(validateAnalysisInput({...base,dataset:"landsat-8"}).details.dataset);
});

test("planned methods cannot masquerade as executable analyses",()=>{
 const result=validateAnalysisInput({analysisType:"flood",dataset:"sentinel-1",startDate:"2026-01-01",endDate:"2026-02-01",comparisonStartDate:"2025-01-01",comparisonEndDate:"2025-02-01"});
 assert.match(result.details.analysisType,/planned/i);
});
