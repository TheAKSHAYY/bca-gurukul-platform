
-- ============================================================
-- PHASE 2: Identity, Roles, Permissions, Audit
-- ============================================================

-- Shared trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'instructor', 'student');

-- ---------- PROFILES ----------
CREATE TABLE public.profiles (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            TEXT,
  display_name         TEXT,
  avatar_url           TEXT,
  bio                  TEXT,
  current_course_id    UUID,
  current_semester_id  UUID,
  locale               TEXT NOT NULL DEFAULT 'en',
  timezone             TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  onboarded_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- USER_ROLES ----------
CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  );
$$;

-- ---------- PERMISSIONS ----------
CREATE TABLE public.permissions (
  key         TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role           public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ---------- AUDIT LOGS ----------
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip          INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------- APP SETTINGS ----------
CREATE TABLE public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- FEATURE FLAGS ----------
CREATE TABLE public.feature_flags (
  key          TEXT PRIMARY KEY,
  module       TEXT NOT NULL,
  description  TEXT,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  rollout_pct  INTEGER NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  audience     JSONB NOT NULL DEFAULT '{}'::jsonb,
  kill_switch  BOOLEAN NOT NULL DEFAULT false,
  updated_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feature_flags_module ON public.feature_flags (module);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_feature_flags_updated BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- MAINTENANCE ----------
CREATE TABLE public.maintenance (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled         BOOLEAN NOT NULL DEFAULT false,
  message         TEXT,
  allowed_roles   public.app_role[] NOT NULL DEFAULT ARRAY['super_admin']::public.app_role[],
  scheduled_start TIMESTAMPTZ,
  scheduled_end   TIMESTAMPTZ,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.maintenance (id, enabled) VALUES (1, false);
GRANT SELECT ON public.maintenance TO anon, authenticated;
GRANT ALL ON public.maintenance TO service_role;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_maintenance_updated BEFORE UPDATE ON public.maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Profiles: read own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Profiles: admins read all" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Profiles: insert own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Profiles: super admin update any" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- user_roles
CREATE POLICY "Roles: read own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Roles: admins read all" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Roles: super admin manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- permissions
CREATE POLICY "Permissions: signed-in read" ON public.permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permissions: super admin manage" ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- role_permissions
CREATE POLICY "RolePerms: signed-in read" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "RolePerms: super admin manage" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- audit_logs (append-only via service_role; admins can read)
CREATE POLICY "Audit: admins read" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- app_settings
CREATE POLICY "Settings: public read" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Settings: super admin manage" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- feature_flags
CREATE POLICY "Flags: public read" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Flags: super admin manage" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- maintenance
CREATE POLICY "Maintenance: public read" ON public.maintenance
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Maintenance: super admin manage" ON public.maintenance
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- SEED baseline permissions and role assignments
-- ============================================================
INSERT INTO public.permissions (key, description) VALUES
  ('courses.manage',       'Create, edit, delete courses and academic tree'),
  ('content.manage',       'Create, edit, delete notes/papers/videos/units'),
  ('quizzes.manage',       'Create, edit, delete quizzes and questions'),
  ('assignments.manage',   'Create, edit, grade assignments'),
  ('users.manage',         'View and edit user accounts'),
  ('roles.manage',         'Assign and revoke roles'),
  ('settings.manage',      'Edit app settings and branding'),
  ('flags.manage',         'Toggle feature flags'),
  ('maintenance.manage',   'Enable maintenance mode'),
  ('analytics.view',       'View admin analytics dashboards'),
  ('system.view',          'View system health and backups'),
  ('audit.view',           'View audit logs')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
SELECT 'super_admin'::public.app_role, key FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('admin', 'courses.manage'),
  ('admin', 'content.manage'),
  ('admin', 'quizzes.manage'),
  ('admin', 'assignments.manage'),
  ('admin', 'users.manage'),
  ('admin', 'analytics.view'),
  ('admin', 'audit.view'),
  ('instructor', 'content.manage'),
  ('instructor', 'quizzes.manage'),
  ('instructor', 'assignments.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.app_settings (key, value, description) VALUES
  ('site.name',        '"BCA Gurukul"',                              'Public site name'),
  ('site.tagline',     '"Learn BCA the right way."',                 'Hero tagline'),
  ('session.idle_minutes', '60',                                     'Idle minutes before client clears session'),
  ('signup.enabled',   'true',                                       'Whether public signup is open')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.feature_flags (key, module, description, enabled) VALUES
  ('module.quizzes',       'quizzes',       'Enable quiz module',        true),
  ('module.assignments',   'assignments',   'Enable assignments module', true),
  ('module.videos',        'videos',        'Enable video module',       true),
  ('module.papers',        'papers',        'Enable papers module',      true),
  ('module.notes',         'notes',         'Enable notes module',       true),
  ('module.announcements', 'announcements', 'Enable announcements',      true),
  ('module.search',        'search',        'Enable global search',      true),
  ('module.ai',            'ai',            'Enable AI features',        false),
  ('module.bulk_import',   'bulk_import',   'Enable bulk import',        true),
  ('landing.signup',       'landing_signup','Show signup CTA on landing',true)
ON CONFLICT (key) DO NOTHING;
