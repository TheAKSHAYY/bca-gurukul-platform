import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthRoute } from "@/lib/post-auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Complete your profile · BCA Gurukul" }] }),
  component: OnboardingPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  courseId: z.string().uuid("Select your course"),
  semesterId: z.string().uuid("Select your semester"),
});

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const [fullName, setFullName] = useState(
    (user.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [courseId, setCourseId] = useState<string>("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // If user is already onboarded (e.g. returning), bounce them home.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.onboarded_at) {
        const dest = await resolvePostAuthRoute(user.id);
        navigate({ to: dest, replace: true });
      }
    })();
  }, [user.id, navigate]);

  const coursesQuery = useQuery({
    queryKey: ["onboarding-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, code")
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const semestersQuery = useQuery({
    queryKey: ["onboarding-semesters", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select("id, number, title")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const initials = useMemo(
    () =>
      fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "?",
    [fullName],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, courseId, semesterId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: parsed.data.fullName,
        display_name: parsed.data.fullName.split(" ")[0],
        current_course_id: parsed.data.courseId,
        current_semester_id: parsed.data.semesterId,
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to BCA Gurukul");
    await router.invalidate();
    const dest = await resolvePostAuthRoute(user.id);
    navigate({ to: dest, replace: true });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
          {initials}
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            One last step
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
            Tell us about you
          </h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll personalise your dashboard with your course and semester.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            autoComplete="name"
            placeholder="e.g. Aditya Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course">Course</Label>
          <Select
            value={courseId}
            onValueChange={(v) => {
              setCourseId(v);
              setSemesterId("");
            }}
            disabled={coursesQuery.isLoading}
          >
            <SelectTrigger id="course">
              <SelectValue
                placeholder={coursesQuery.isLoading ? "Loading…" : "Choose your course"}
              />
            </SelectTrigger>
            <SelectContent>
              {(coursesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ${c.title}` : c.title}
                </SelectItem>
              ))}
              {coursesQuery.data && coursesQuery.data.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No courses available yet.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="semester">Current semester</Label>
          <Select
            value={semesterId}
            onValueChange={setSemesterId}
            disabled={!courseId || semestersQuery.isLoading}
          >
            <SelectTrigger id="semester">
              <SelectValue
                placeholder={
                  !courseId
                    ? "Pick a course first"
                    : semestersQuery.isLoading
                      ? "Loading…"
                      : "Choose your semester"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(semestersQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Semester {s.number}
                  {s.title ? ` — ${s.title}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue to dashboard
        </Button>
      </form>
    </div>
  );
}
