import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "First-time setup · BCA Gurukul" }] }),
  component: SetupPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "At least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

function SetupPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("bootstrap_status");
      if (cancelled) return;
      if (error) {
        toast.error("Could not check setup status");
        setChecking(false);
        return;
      }
      const hasSuperAdmin = data === true;
      if (hasSuperAdmin) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setAvailable(true);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(values: FormValues) {
    // 1. Create the auth user
    const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: values.fullName },
      },
    });
    if (signUpErr || !signUp.user) {
      toast.error(signUpErr?.message ?? "Could not create account");
      return;
    }

    // 2. Grant super_admin (race-safe; fails if one already exists)
    const { error: grantErr } = await supabase.rpc("bootstrap_grant_super_admin", {
      _target_user_id: signUp.user.id,
    });
    if (grantErr) {
      toast.error(grantErr.message);
      return;
    }

    toast.success("Super admin created. You can sign in now.");
    navigate({ to: "/auth", replace: true });
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!available) return null;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            One-time setup
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
            Create the first Super Admin
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is only available until the first Super Admin is created. After that, it is
            disabled forever.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              {...register("fullName")}
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                {...register("password")}
                onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {capsOn && <p className="text-xs text-accent-foreground">Caps Lock is on</p>}
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              {...register("confirm")}
              aria-invalid={Boolean(errors.confirm)}
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create Super Admin"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already set up?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Go to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
