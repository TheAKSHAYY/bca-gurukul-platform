
DO $$ BEGIN
  CREATE TYPE public.notification_kind AS ENUM ('system','content','quiz','announcement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind public.notification_kind NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  status public.notification_status NOT NULL DEFAULT 'published',
  read_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, published_at DESC)
  WHERE deleted_at IS NULL AND status = 'published';

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own published notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'published'
    AND deleted_at IS NULL
  );

CREATE POLICY "Students mark own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
