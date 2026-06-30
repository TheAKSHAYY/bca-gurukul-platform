
-- Add new enum values
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'about';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'why_us';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'universities';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'popular_courses';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'categories';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'statistics';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'faculty';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'learning_process';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'blog';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'contact';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'newsletter';
ALTER TYPE public.homepage_section_type ADD VALUE IF NOT EXISTS 'footer';
