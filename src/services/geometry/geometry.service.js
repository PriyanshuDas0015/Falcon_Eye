import { config } from "../../config/env.js";
export function validateGeometry(g) {
  if (!g || !["Polygon","MultiPolygon"].includes(g.type) || !Array.isArray(g.coordinates)) throw Object.assign(new Error("The selected area must be a Polygon or MultiPolygon."),{code:"INVALID_GEOMETRY"});
  const points=[];
  const walk=x=>{ if (typeof x?.[0] === "number") { if (x.length<2 || !Number.isFinite(x[0]) || !Number.isFinite(x[1]) || Math.abs(x[0])>180 || Math.abs(x[1])>90) throw Object.assign(new Error("The selected area contains invalid coordinates."),{code:"INVALID_GEOMETRY"}); points.push(x); } else if(Array.isArray(x)) x.forEach(walk); else throw Object.assign(new Error("The selected area geometry is malformed."),{code:"INVALID_GEOMETRY"}); };
  walk(g.coordinates);
  if(points.length<4) throw Object.assign(new Error("The selected area is empty or incomplete."),{code:"INVALID_GEOMETRY"});
  const polygons=g.type==="Polygon"?[g.coordinates]:g.coordinates;
  for(const polygon of polygons){if(!Array.isArray(polygon)||!polygon.length)throw Object.assign(new Error("The selected area has an empty polygon ring."),{code:"INVALID_GEOMETRY"});for(const ring of polygon){if(!Array.isArray(ring)||ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw Object.assign(new Error("Polygon rings must be closed and contain at least four coordinates."),{code:"INVALID_GEOMETRY"});}}
  const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]); const approximate=Math.abs((Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))*111.32*111.32*Math.cos((ys.reduce((a,b)=>a+b,0)/ys.length)*Math.PI/180));
  if(approximate<=0 || approximate>config.maxAoiKm2) throw Object.assign(new Error(`Area exceeds the configured maximum of ${config.maxAoiKm2} km².`),{code:"INVALID_GEOMETRY"});
  return { geometry:g, approximateAreaKm2:approximate };
}
