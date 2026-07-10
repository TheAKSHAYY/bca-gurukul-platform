-- Replace the blanket authenticated read policy with per-bucket, metadata-gated policies.
DROP POLICY IF EXISTS "content_read_authenticated" ON storage.objects;

-- Branding assets: site logo/favicon/OG — non-sensitive, keep broad authenticated read.
CREATE POLICY "branding_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'branding');

-- Media library: generic uploads (avatars, homepage images, thumbnails).
CREATE POLICY "media_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media');

-- Notes bucket: only files backing a published, non-private note or content_item.
CREATE POLICY "notes_read_gated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notes' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.file_bucket = 'notes'
        AND n.file_path = storage.objects.name
        AND n.deleted_at IS NULL
        AND n.status = 'published'
        AND n.visibility IN ('public','students')
    )
    OR EXISTS (
      SELECT 1 FROM public.content_items c
      WHERE c.file_bucket = 'notes'
        AND c.file_path = storage.objects.name
        AND c.deleted_at IS NULL
        AND c.status = 'published'
        AND c.visibility IN ('public'::content_visibility,'students'::content_visibility)
    )
  )
);

-- Papers bucket: only files backing a published paper or content_item.
CREATE POLICY "papers_read_gated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'papers' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.file_bucket = 'papers'
        AND p.file_path = storage.objects.name
        AND p.deleted_at IS NULL
        AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.content_items c
      WHERE c.file_bucket = 'papers'
        AND c.file_path = storage.objects.name
        AND c.deleted_at IS NULL
        AND c.status = 'published'
        AND c.visibility IN ('public'::content_visibility,'students'::content_visibility)
    )
  )
);

-- Assignments bucket: only files backing a published content_item.
CREATE POLICY "assignments_read_gated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assignments' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.content_items c
      WHERE c.file_bucket = 'assignments'
        AND c.file_path = storage.objects.name
        AND c.deleted_at IS NULL
        AND c.status = 'published'
        AND c.visibility IN ('public'::content_visibility,'students'::content_visibility)
    )
  )
);