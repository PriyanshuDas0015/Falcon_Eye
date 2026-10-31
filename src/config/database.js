import pg from "pg";
import { config } from "./env.js";
export const pool = config.databaseUrl ? new pg.Pool({ connectionString: config.databaseUrl, ssl: config.production ? { rejectUnauthorized: true } : undefined }) : null;
