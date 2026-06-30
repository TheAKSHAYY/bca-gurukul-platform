
CREATE TABLE public.user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_jti   TEXT,
  device_kind   TEXT NOT NULL DEFAULT 'web',
  user_agent    TEXT,
  ip            INET,
  country       TEXT,
  city          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX idx_user_sessions_user ON public.user_sessions (user_id, last_seen_at DESC);
CREATE INDEX idx_user_sessions_active ON public.user_sessions (user_id) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions: read own" ON public.user_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sessions: admins read all" ON public.user_sessions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Sessions: insert own" ON public.user_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sessions: update own" ON public.user_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sessions: super admin manage" ON public.user_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
