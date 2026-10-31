import app from "./app.js";
import { pool } from "./config/database.js";
import { config } from "./config/env.js";
import { initialize,getStatus } from "./services/earth-engine/client.js";
const main=async()=>{
 if(!pool){if(config.production)throw new Error("DATABASE_URL is required in production.");console.warn(JSON.stringify({level:"warn",event:"database_not_configured",message:"Starting local interface-only mode; accounts, saved data and analysis APIs are unavailable."}));}
 else{await pool.query("SELECT PostGIS_Version()");const schema=await pool.query("SELECT to_regclass('public.users') AS users");if(!schema.rows[0].users)throw new Error("Falcon Eye database schema is missing. Run npm run migrate.");console.log(JSON.stringify({level:"info",event:"database_connected",postgis:"available"}));}
 await initialize();console.log(JSON.stringify({level:"info",event:"earth_engine_status",status:getStatus()}));const server=app.listen(config.port,()=>console.log(JSON.stringify({level:"info",event:"server_started",port:config.port,mode:pool?"full":"interface_only"})));for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>server.close(async()=>{if(pool)await pool.end();process.exit(0);}));
};main().catch(e=>{console.error(JSON.stringify({level:"error",event:"startup_failed",message:e.message}));process.exit(1);});
