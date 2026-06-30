import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · BCA Gurukul" }] }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session token in the URL hash; the client
    // picks it up automatically. We just confirm a session exists.
    let cancelled = false;
    (async () => {
      // Small delay so the hash-driven session can settle.
      await new Promise((r) => setTimeout(r, 50));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        toast.error("This reset link is invalid or expired");
        navigate({ to: "/auth", search: { mode: "forgot" }, replace: true });
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in again.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password you don't use anywhere else.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="new-pass">New password</Label>
            <PasswordInput
              id="new-pass"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onCapsLockChange={setCapsOn}
              required
            />
            {capsOn && (
              <p className="text-xs font-medium text-accent-foreground">Caps Lock is on</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass">Confirm new password</Label>
            <PasswordInput
              id="confirm-pass"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
