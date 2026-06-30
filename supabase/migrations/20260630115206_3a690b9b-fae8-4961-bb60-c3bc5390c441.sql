
-- Authenticated users can read shared content buckets
CREATE POLICY "content_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('notes','papers','assignments','media','branding'));

-- Admins can manage shared content buckets
CREATE POLICY "content_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('notes','papers','assignments','media','branding')
  AND public.is_admin(auth.uid())
);
CREATE POLICY "content_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('notes','papers','assignments','media','branding')
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id IN ('notes','papers','assignments','media','branding')
  AND public.is_admin(auth.uid())
);
CREATE POLICY "content_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('notes','papers','assignments','media','branding')
  AND public.is_admin(auth.uid())
);

-- Submissions: user owns their own folder (first path segment = auth.uid())
CREATE POLICY "submissions_owner_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
CREATE POLICY "submissions_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "submissions_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
CREATE POLICY "submissions_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
