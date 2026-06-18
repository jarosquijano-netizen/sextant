CREATE TABLE IF NOT EXISTS profile (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company TEXT,
  title TEXT,
  url TEXT,
  description TEXT,
  match_score INTEGER,
  matched_skills TEXT[],
  status TEXT DEFAULT 'saved',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  status_updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_artifacts (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  kind TEXT,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id SERIAL PRIMARY KEY,
  generated_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB NOT NULL
);
