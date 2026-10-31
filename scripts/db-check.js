import pg from "pg";
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required.");const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const r=await pool.query("SELECT PostGIS_Version() version");console.log(`PostGIS available: ${r.rows[0].version}`);}finally{await pool.end();}
