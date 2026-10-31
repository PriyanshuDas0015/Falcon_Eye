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

test("planned methods cannot masquerade as executable analyses",()=>{
 const result=validateAnalysisInput({analysisType:"flood",dataset:"sentinel-1",startDate:"2026-01-01",endDate:"2026-02-01",comparisonStartDate:"2025-01-01",comparisonEndDate:"2025-02-01"});
 assert.match(result.details.analysisType,/planned/i);
});
