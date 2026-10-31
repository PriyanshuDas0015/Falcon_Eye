import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/config/database.js";

test("health endpoint reports service readiness",async()=>{
 const response=await request(app).get("/api/health");
 assert.equal(response.status,200);
 assert.ok(["ok","degraded"].includes(response.body.status));
 assert.ok("database" in response.body&&"postgis" in response.body&&"earthEngine" in response.body);
});

test("analysis registry is served by the API",async()=>{
 const response=await request(app).get("/api/analysis/types");
 assert.equal(response.status,200);
 assert.ok(response.body.analysisTypes.some(type=>type.id==="vegetation"));
 assert.equal(response.body.analysisTypes.find(type=>type.id==="roads").status,"PLANNED");
});

test("versioned capabilities endpoint is the source of truth",async()=>{
 const response=await request(app).get("/api/v1/capabilities").set("X-Request-ID","test-capabilities");
 assert.equal(response.status,200);assert.equal(response.body.success,true);assert.equal(response.headers["x-request-id"],"test-capabilities");
 assert.ok(response.body.data.capabilities.some(type=>type.id==="land-use"&&type.status==="REQUIRES_EARTH_ENGINE"));
 assert.equal(response.body.data.datasets["sentinel-1"].id,"COPERNICUS/S1_GRD");
});

test("readiness distinguishes missing dependencies from process health",async()=>{
 const health=await request(app).get("/api/v1/health"),readiness=await request(app).get("/api/v1/readiness");
 assert.equal(health.status,200);assert.equal(health.body.services.application,"ready");
 if(!pool){assert.equal(readiness.status,503);assert.equal(readiness.body.data.status,"not_ready");assert.equal(readiness.body.data.services.database,"not_configured");}
});

test("public pages and frontend modules are served by one application",async()=>{
 for(const page of ["/","/login.html","/register.html","/explorer.html"]){const response=await request(app).get(page);assert.equal(response.status,200,page);assert.match(response.headers["content-type"],/text\/html/);}
 const home=await request(app).get("/");assert.match(home.text,/earth-canvas/);assert.match(home.text,/\/vendor\/gsap\/gsap\.min\.js/);assert.match(home.text,/Satellite Intelligence/);
 const explorer=await request(app).get("/explorer.html");assert.match(explorer.text,/leaflet\.draw\.js/);assert.match(explorer.text,/geometry-preview/);assert.match(explorer.text,/export-geometry/);
 const module=await request(app).get("/js/explorer.js");assert.equal(module.status,200);assert.match(module.text,/GeoJSON/);
});

test("npm-managed animation assets and reduced-motion CSS are available",async()=>{
 for(const asset of ["/vendor/three/three.module.js","/vendor/gsap/gsap.min.js","/vendor/gsap/ScrollTrigger.min.js","/vendor/lenis/lenis.mjs"]){const response=await request(app).get(asset);assert.equal(response.status,200,asset);assert.match(response.headers["content-type"],/javascript/);}
 const styles=await request(app).get("/css/home.css");assert.equal(styles.status,200);assert.match(styles.text,/prefers-reduced-motion/);assert.match(styles.text,/command-card/);
});

test("protected account endpoint requires authentication",async()=>{
 const response=await request(app).get("/api/v1/account");assert.equal(response.status,401);assert.equal(response.body.code,"AUTHENTICATION_REQUIRED");
});

test("unknown API endpoints return a standardized error",async()=>{
 const response=await request(app).get("/api/v1/does-not-exist");assert.equal(response.status,404);assert.deepEqual(Object.keys(response.body).filter(key=>["success","code","message","requestId"].includes(key)).sort(),["code","message","requestId","success"]);
});

test("account creation reports missing database without pretending success",{skip:Boolean(pool)},async()=>{
 const agent=request.agent(app);const csrf=await agent.get("/api/auth/csrf");
 const response=await agent.post("/api/auth/register").set("X-CSRF-Token",csrf.body.csrfToken).send({name:"Test User",email:"test@example.test",password:"long-test-password"});
 assert.equal(response.status,503);assert.equal(response.body.code,"DATABASE_NOT_CONFIGURED");assert.equal(response.body.success,false);
});
