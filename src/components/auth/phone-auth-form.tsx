import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthRoute } from "@/lib/post-auth";

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 India (+91)" },
  { code: "+1", label: "🇺🇸 USA / Canada (+1)" },
  { code: "+44", label: "🇬🇧 UK (+44)" },
  { code: "+61", label: "🇦🇺 Australia (+61)" },
  { code: "+971", label: "🇦🇪 UAE (+971)" },
  { code: "+65", label: "🇸🇬 Singapore (+65)" },
];

const RESEND_SECONDS = 60;

export function PhoneAuthForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [country, setCountry] = useState("+91");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const otpAbortRef = useRef<AbortController | null>(null);

  // Tick down the resend timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Web OTP API (auto-fill SMS code on supported browsers)
  useEffect(() => {
    if (step !== "otp") return;
    const w = window as unknown as {
      OTPCredential?: unknown;
      navigator: Navigator & {
        credentials?: { get?: (o: unknown) => Promise<{ code?: string } | null> };
      };
    };
    if (!w.OTPCredential || !w.navigator.credentials?.get) return;
    const ac = new AbortController();
    otpAbortRef.current = ac;
    w.navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((cred) => {
        if (cred?.code) {
          setOtp(cred.code);
          void verifyOtp(cred.code);
        }
      })
      .catch(() => {
        /* user cancelled or unsupported */
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const fullNumber = `${country}${phone.replace(/[^\d]/g, "")}`;

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = z
      .string()
      .regex(/^\+\d{8,15}$/, "Enter a valid mobile number")
      .safeParse(fullNumber);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullNumber,
      options: { channel: "sms" },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`OTP sent to ${fullNumber}`);
    setStep("otp");
    setSecondsLeft(RESEND_SECONDS);
  }

  async function verifyOtp(code?: string) {
    const token = (code ?? otp).trim();
    if (token.length < 4) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullNumber,
      token,
      type: "sms",
    });
    setLoading(false);
    if (error || !data.user) {
      toast.error(error?.message ?? "Invalid OTP");
      return;
    }
    toast.success("Phone verified");
    const dest = redirect ?? (await resolvePostAuthRoute(data.user.id));
    await router.invalidate();
    navigate({ to: dest, replace: true });
  }

  if (step === "otp") {
    return (
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void verifyOtp();
        }}
      >
        <div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
            Enter verification code
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{fullNumber}</span>.
          </p>
        </div>
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (v.length === 6) void verifyOtp(v);
            }}
            autoFocus
            inputMode="numeric"
            // hint to browsers / SMS auto-fill
            // @ts-expect-error standard HTML attribute
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify & continue
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setStep("phone");
              setOtp("");
            }}
          >
            Change number
          </button>
          <button
            type="button"
            disabled={secondsLeft > 0 || loading}
            onClick={() => void sendOtp()}
            className="text-primary disabled:text-muted-foreground"
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={sendOtp}>
      <div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Phone className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
          Sign in with mobile
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We&apos;ll send a one-time code by SMS.
        </p>
      </div>
      <div className="grid grid-cols-[140px_1fr] gap-2">
        <div className="space-y-2">
          <Label htmlFor="country-code">Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="country-code">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send OTP
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Standard SMS rates may apply. By continuing you agree to our terms.
      </p>
    </form>
  );
}
