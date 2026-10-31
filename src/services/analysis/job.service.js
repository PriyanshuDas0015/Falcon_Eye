import { setImmediate } from "node:timers";
import { runEarthEngineAnalysis } from "./earthEngineAnalysis.service.js";

function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export async function processAnalysisJob(pool, jobId) {
  const claimed = await pool.query(
    `UPDATE analysis_jobs SET status='PROCESSING',progress='Processing satellite imagery',started_at=now(),updated_at=now()
     WHERE id=$1 AND status='PENDING'
     RETURNING id,analysis_type,satellite_source,start_date,end_date,comparison_start_date,comparison_end_date,
       parameters_json,ST_AsGeoJSON(geometry)::json AS geometry`, [jobId]
  );
  if (!claimed.rowCount) return;
  const job = claimed.rows[0];
  console.info(JSON.stringify({ timestamp:new Date().toISOString(), level:"info", event:"analysis_started", analysisId:job.id, analysisType:job.analysis_type }));
  try {
    const result = await runEarthEngineAnalysis({ analysisType:job.analysis_type, dataset:job.satellite_source, geometry:job.geometry,
      startDate:dateOnly(job.start_date), endDate:dateOnly(job.end_date),
      comparisonStartDate:job.comparison_start_date?dateOnly(job.comparison_start_date):undefined,
      comparisonEndDate:job.comparison_end_date?dateOnly(job.comparison_end_date):undefined, parameters:job.parameters_json||{} });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO analysis_results(analysis_job_id,result_json,area_after,metadata_json) VALUES($1,$2,$3,$4)
        ON CONFLICT(analysis_job_id) DO UPDATE SET result_json=excluded.result_json,area_after=excluded.area_after,metadata_json=excluded.metadata_json,updated_at=now()`,
        [job.id,JSON.stringify(result),result.area?.vegetationSqKm??result.area?.estimatedWaterSqKm??null,JSON.stringify(result.metadata||{})]);
      await client.query("UPDATE analysis_jobs SET status='COMPLETED',progress=NULL,error_code=NULL,error_message=NULL,completed_at=now(),updated_at=now() WHERE id=$1",[job.id]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    console.info(JSON.stringify({ timestamp:new Date().toISOString(), level:"info", event:"analysis_completed", analysisId:job.id, analysisType:job.analysis_type }));
  } catch (error) {
    const code=error.code||"ANALYSIS_FAILED",message=error.message||"Analysis failed.";
    await pool.query("UPDATE analysis_jobs SET status='FAILED',progress=NULL,error_code=$2,error_message=$3,completed_at=now(),updated_at=now() WHERE id=$1",[job.id,code,message]);
    console.warn(JSON.stringify({ timestamp:new Date().toISOString(), level:"warn", event:"analysis_failed", analysisId:job.id, analysisType:job.analysis_type, code }));
  }
}

export function enqueueAnalysisJob(pool, jobId) {
  setImmediate(()=>processAnalysisJob(pool,jobId).catch(error=>console.error(JSON.stringify({ timestamp:new Date().toISOString(), level:"error", event:"analysis_worker_failed", analysisId:jobId, message:error.message }))));
}
