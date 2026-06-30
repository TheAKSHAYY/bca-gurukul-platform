
-- Developer Portfolio tables

-- 1. Singleton profile
CREATE TABLE public.developer_profile (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name TEXT,
  professional_title TEXT,
  short_intro TEXT,
  bio TEXT,
  education TEXT,
  current_goal TEXT,
  career_objective TEXT,
  interests TEXT,
  email TEXT,
  photo_url TEXT,
  resume_url TEXT,
  github_username TEXT,
  hero_cta_primary_label TEXT DEFAULT 'View Projects',
  hero_cta_secondary_label TEXT DEFAULT 'Download Resume',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.developer_profile TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_profile TO authenticated;
GRANT ALL ON public.developer_profile TO service_role;

ALTER TABLE public.developer_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read developer profile"
  ON public.developer_profile FOR SELECT
  USING (true);

CREATE POLICY "Admins manage developer profile"
  ON public.developer_profile FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_developer_profile_updated_at
  BEFORE UPDATE ON public.developer_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed singleton row
INSERT INTO public.developer_profile (id) VALUES (1) ON CONFLICT DO NOTHING;


-- 2. Social links
CREATE TABLE public.developer_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.developer_social_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_social_links TO authenticated;
GRANT ALL ON public.developer_social_links TO service_role;

ALTER TABLE public.developer_social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled social links"
  ON public.developer_social_links FOR SELECT
  USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage social links"
  ON public.developer_social_links FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_developer_social_links_updated_at
  BEFORE UPDATE ON public.developer_social_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial social links
INSERT INTO public.developer_social_links (platform, url, sort_order) VALUES
  ('github', 'https://github.com/TheAKSHAYY', 1),
  ('linkedin', 'https://www.linkedin.com/in/akkshay-sharma', 2),
  ('instagram', 'https://www.instagram.com/sly.akshay', 3);


-- 3. Projects
CREATE TABLE public.developer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  thumbnail_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  github_url TEXT,
  live_url TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.developer_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_projects TO authenticated;
GRANT ALL ON public.developer_projects TO service_role;

ALTER TABLE public.developer_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published projects"
  ON public.developer_projects FOR SELECT
  USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage projects"
  ON public.developer_projects FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_developer_projects_updated_at
  BEFORE UPDATE ON public.developer_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 4. Skills
CREATE TABLE public.developer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'language',
  icon TEXT,
  proficiency INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.developer_skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_skills TO authenticated;
GRANT ALL ON public.developer_skills TO service_role;

ALTER TABLE public.developer_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled skills"
  ON public.developer_skills FOR SELECT
  USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage skills"
  ON public.developer_skills FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_developer_skills_updated_at
  BEFORE UPDATE ON public.developer_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 5. Achievements
CREATE TABLE public.developer_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'certificate',
  issuer TEXT,
  description TEXT,
  date_awarded DATE,
  url TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.developer_achievements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_achievements TO authenticated;
GRANT ALL ON public.developer_achievements TO service_role;

ALTER TABLE public.developer_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled achievements"
  ON public.developer_achievements FOR SELECT
  USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage achievements"
  ON public.developer_achievements FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_developer_achievements_updated_at
  BEFORE UPDATE ON public.developer_achievements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
