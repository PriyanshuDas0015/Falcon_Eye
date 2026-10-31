import test from "node:test";
import assert from "node:assert/strict";
import { validateGeometry } from "../src/services/geometry/geometry.service.js";
test("accepts a valid polygon geometry",()=>{const result=validateGeometry({type:"Polygon",coordinates:[[[0,0],[0,0.01],[0.01,0.01],[0.01,0],[0,0]]]});assert.equal(result.geometry.type,"Polygon");assert.ok(result.approximateAreaKm2>0);});
test("rejects unsupported and malformed geometry",()=>{assert.throws(()=>validateGeometry({type:"Point",coordinates:[0,0]}),{code:"INVALID_GEOMETRY"});assert.throws(()=>validateGeometry({type:"Polygon",coordinates:[[[181,0],[0,0],[0,1],[181,0]]]}),{code:"INVALID_GEOMETRY"});});
