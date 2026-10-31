CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_idx ON users (lower(email));
CREATE INDEX IF NOT EXISTS saved_areas_user_updated_idx ON saved_areas(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS analysis_jobs_user_status_date_idx ON analysis_jobs(user_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_jobs_user_type_date_idx ON analysis_jobs(user_id,analysis_type,created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_jobs_user_dataset_date_idx ON analysis_jobs(user_id,satellite_source,created_at DESC);
CREATE INDEX IF NOT EXISTS reports_user_date_idx ON reports(user_id,created_at DESC);
