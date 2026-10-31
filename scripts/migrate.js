import "../src/config/env.js";
import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir=path.dirname(fileURLToPath(import.meta.url));const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required.");const pool=new pg.Pool({connectionString:url});
try{await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");if(process.argv[2]==="down")throw new Error("Down migration is not available for the initial schema; back up the database before manually rolling it back.");for(const name of (await fs.readdir(path.join(dir,"..","migrations"))).filter(n=>n.endsWith(".sql")).sort()){const done=await pool.query("SELECT 1 FROM schema_migrations WHERE name=$1",[name]);if(done.rowCount)continue;const sql=await fs.readFile(path.join(dir,"..","migrations",name),"utf8");const c=await pool.connect();try{await c.query("BEGIN");await c.query(sql);await c.query("INSERT INTO schema_migrations(name) VALUES($1)",[name]);await c.query("COMMIT");console.log(`Applied ${name}`);}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}}}finally{await pool.end();}
