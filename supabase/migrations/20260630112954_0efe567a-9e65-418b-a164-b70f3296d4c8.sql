
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_feature_enabled(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT, UUID) TO service_role;
