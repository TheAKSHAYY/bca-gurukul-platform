import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter, scorePassword } from "@/components/auth/password-strength";
import { PhoneAuthForm } from "@/components/auth/phone-auth-form";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { resolvePostAuthRoute } from "@/lib/post-auth";


const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in · BCA Gurukul" },
      {
        name: "description",
        content:
          "Sign in or create your BCA Gurukul account to access notes, papers, videos, and MCQ practice.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().email("Enter a valid email");
const passwordSchema = z.string().min(8, "At least 8 characters");

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              color: "currentColor",
            }}
          />
        </div>

        <Link to="/" className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-foreground text-primary shadow-sm">
            <span className="font-display text-lg font-semibold">ब</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">BCA Gurukul</div>
            <div className="text-xs text-primary-foreground/70">
              Structured learning for BCA students
            </div>
          </div>
        </Link>

        <div className="relative space-y-8">
          <div>
            <Sparkles className="h-8 w-8 text-accent" />
            <h2 className="mt-5 max-w-md font-display text-4xl font-semibold leading-tight">
              Your syllabus, organised.<br />Your time, respected.
            </h2>
            <p className="mt-4 max-w-md text-sm text-primary-foreground/80">
              Join thousands of BCA students using notes, past papers, video
              lectures and MCQ practice — all in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              "Free for every BCA student",
              "Notes, papers, videos & quizzes",
              "Track progress semester by semester",
            ].map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/70">
          <ShieldCheck className="h-4 w-4" />
          Secured by Supabase Auth · We never share your data.
        </div>
      </aside>

      {/* Right: form */}
      <div className="relative flex min-h-screen flex-col bg-background px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-display text-sm font-semibold">ब</span>
            </div>
            <span className="font-display text-sm font-semibold">BCA Gurukul</span>
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Tabs defaultValue={mode} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
              <TabsTrigger value="forgot">Reset</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-8">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-8">
              <SignUpForm />
            </TabsContent>
            <TabsContent value="forgot" className="mt-8">
              <ForgotForm />
            </TabsContent>
          </Tabs>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          Free for students · No credit card
        </div>
      </div>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      or
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function SignInForm() {
  const { redirect } = Route.useSearch();
  const [method, setMethod] = useState<"email" | "phone">("email");

  return (
    <div className="space-y-4">
      <GoogleSignInButton redirect={redirect} />
      <OrDivider />
      <Tabs value={method} onValueChange={(v) => setMethod(v as "email" | "phone")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Mobile OTP</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-6">
          <EmailSignInForm />
        </TabsContent>
        <TabsContent value="phone" className="mt-6">
          <PhoneAuthForm redirect={redirect} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmailSignInForm() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({ email: emailSchema, password: z.string().min(1, "Password is required") })
      .safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    if (!remember) {
      try {
        sessionStorage.setItem("sb-prefer-session-only", "1");
      } catch {
        /* ignore */
      }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    await router.invalidate();
    const dest = redirect ?? (data.user ? await resolvePostAuthRoute(data.user.id) : "/dashboard");
    navigate({ to: dest, replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <Link
            to="/auth"
            search={{ mode: "forgot" }}
            className="text-xs text-primary hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <PasswordInput
          id="signin-password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onCapsLockChange={setCapsOn}
          required
        />
        {capsOn && (
          <p className="text-xs font-medium text-accent-foreground">Caps Lock is on</p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={remember}
          onCheckedChange={(v) => setRemember(v === true)}
          aria-label="Remember me"
        />
        Remember me on this device
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({
        fullName: z.string().min(2, "Full name is required"),
        email: emailSchema,
        password: passwordSchema,
      })
      .safeParse({ fullName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (scorePassword(password).score < 2) {
      toast.error("Please choose a stronger password");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session || !data.user) {
      toast.success("Check your email to confirm your account.");
      return;
    }
    toast.success("Account created — welcome!");
    await router.invalidate();
    const dest = redirect ?? (await resolvePostAuthRoute(data.user.id));
    navigate({ to: dest, replace: true });
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton redirect={redirect} />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Full name</Label>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onCapsLockChange={setCapsOn}
            required
          />
          {capsOn && (
            <p className="text-xs font-medium text-accent-foreground">Caps Lock is on</p>
          )}
          <PasswordStrengthMeter password={password} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}



function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent. Check your inbox.");
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-6 text-sm">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h2 className="font-display text-lg font-semibold text-foreground">Check your inbox</h2>
        <p className="text-muted-foreground">
          We sent a password reset link to <span className="font-medium text-foreground">{email}</span>. The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We'll email you a secure link to set a new password.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          to="/auth"
          search={{ mode: "signin" }}
          className="font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
