
-- Rate limiting table for auth, telemetry, file-sign, search endpoints
CREATE TABLE public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, identifier, window_start)
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (bucket_key, identifier, window_start DESC);
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits (window_start);

GRANT ALL ON public.rate_limits TO service_role;
-- No anon/authenticated grants; only server fns with service role touch this.

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
ON public.rate_limits FOR ALL
USING (false) WITH CHECK (false);
-- service_role bypasses RLS; the false policy ensures no anon/auth client can read/write.

-- Helper: atomic increment + check
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _bucket_key TEXT,
  _identifier TEXT,
  _max_per_minute INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window TIMESTAMPTZ := date_trunc('minute', now());
  _new_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (bucket_key, identifier, window_start, count)
  VALUES (_bucket_key, _identifier, _window, 1)
  ON CONFLICT (bucket_key, identifier, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _new_count;

  RETURN _new_count <= _max_per_minute;
END;
$$;

-- Feature flag evaluator (consulted by route gates + server fns)
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_key TEXT, _user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _flag RECORD;
BEGIN
  SELECT enabled, rollout_pct, kill_switch
  INTO _flag
  FROM public.feature_flags
  WHERE key = _key
  LIMIT 1;

  IF NOT FOUND THEN RETURN TRUE; END IF; -- unknown flags default ON
  IF _flag.kill_switch THEN RETURN FALSE; END IF;
  IF NOT _flag.enabled THEN RETURN FALSE; END IF;
  IF _flag.rollout_pct IS NULL OR _flag.rollout_pct >= 100 THEN RETURN TRUE; END IF;
  IF _user_id IS NULL THEN RETURN _flag.rollout_pct >= 100; END IF;
  -- Stable bucketing by user id hash
  RETURN (abs(hashtext(_user_id::text)) % 100) < _flag.rollout_pct;
END;
$$;
