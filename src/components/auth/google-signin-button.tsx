import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Google OAuth sign-in. Requires the Google provider to be enabled
 * in the Supabase dashboard (Authentication → Providers → Google).
 *
 * Supabase handles the full redirect dance; we just trigger it and
 * land back on /auth/callback which forwards to the right role page.
 */
export function GoogleSignInButton({ redirect }: { redirect?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const params = new URLSearchParams();
    if (redirect) params.set("redirect", redirect);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
    // On success the browser navigates away to Google.
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={signIn}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleLogo className="mr-2 h-4 w-4" />
      )}
      Continue with Google
    </Button>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.7 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.9 35 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
