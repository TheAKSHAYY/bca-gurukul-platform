import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/superadmin/branding")({
  head: () => ({ meta: [{ title: "Branding · BCA Gurukul" }] }),
  component: BrandingPage,
});

const schema = z.object({
  site_name: z.string().min(1, "Required").max(80),
  tagline: z.string().max(200).optional().nullable(),
  logo_text: z.string().max(40).optional().nullable(),
  logo_url: z.string().url().optional().or(z.literal("")).nullable(),
  favicon_url: z.string().url().optional().or(z.literal("")).nullable(),
  support_email: z.string().email().optional().or(z.literal("")).nullable(),
  footer_text: z.string().max(300).optional().nullable(),
  seo_title: z.string().max(120).optional().nullable(),
  seo_description: z.string().max(300).optional().nullable(),
  og_image_url: z.string().url().optional().or(z.literal("")).nullable(),
  primary_color: z.string().max(80).optional().nullable(),
  secondary_color: z.string().max(80).optional().nullable(),
  accent_color: z.string().max(80).optional().nullable(),
  font_heading: z.string().max(60).optional().nullable(),
  font_body: z.string().max(60).optional().nullable(),
  radius_rem: z.coerce.number().min(0).max(2).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

function BrandingPage() {
  const queryClient = useQueryClient();

  const brandingQuery = useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branding").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: brandingQuery.data
      ? {
          site_name: brandingQuery.data.site_name ?? "",
          tagline: brandingQuery.data.tagline ?? "",
          logo_text: brandingQuery.data.logo_text ?? "",
          logo_url: brandingQuery.data.logo_url ?? "",
          favicon_url: brandingQuery.data.favicon_url ?? "",
          support_email: brandingQuery.data.support_email ?? "",
          footer_text: brandingQuery.data.footer_text ?? "",
          seo_title: brandingQuery.data.seo_title ?? "",
          seo_description: brandingQuery.data.seo_description ?? "",
          og_image_url: brandingQuery.data.og_image_url ?? "",
          primary_color: brandingQuery.data.primary_color ?? "",
          secondary_color: brandingQuery.data.secondary_color ?? "",
          accent_color: brandingQuery.data.accent_color ?? "",
          font_heading: brandingQuery.data.font_heading ?? "Fraunces",
          font_body: brandingQuery.data.font_body ?? "Inter",
          radius_rem: brandingQuery.data.radius_rem ?? 0.75,
        }
      : undefined,
  });

  const saveBranding = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        site_name: values.site_name,
        tagline: values.tagline || null,
        logo_text: values.logo_text || null,
        logo_url: values.logo_url || null,
        favicon_url: values.favicon_url || null,
        support_email: values.support_email || null,
        footer_text: values.footer_text || null,
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
        og_image_url: values.og_image_url || null,
        primary_color: values.primary_color || null,
        secondary_color: values.secondary_color || null,
        accent_color: values.accent_color || null,
        font_heading: values.font_heading || null,
        font_body: values.font_body || null,
        radius_rem: values.radius_rem ?? null,
      };
      const { error } = await supabase.from("branding").update(payload).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branding updated");
      queryClient.invalidateQueries({ queryKey: ["branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMaintenance = useMutation({
    mutationFn: async (enabled: boolean) => {
      const existing = maintenanceQuery.data;
      if (existing) {
        const { error } = await supabase
          .from("maintenance")
          .update({ enabled })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("maintenance")
          .insert({ enabled, message: "We'll be right back." });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Maintenance updated");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link
            to="/admin/superadmin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Super Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Branding & Site Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          The identity students see across the platform, emails, and shareable links.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Maintenance mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When enabled, students see a maintenance page. Admins can still sign in.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Switch
              checked={!!maintenanceQuery.data?.enabled}
              onCheckedChange={(v) => toggleMaintenance.mutate(v)}
              disabled={toggleMaintenance.isPending}
            />
            <span className="text-sm font-medium">
              {maintenanceQuery.data?.enabled ? "Site is in maintenance mode" : "Site is live"}
            </span>
          </div>
        </section>

        <form
          onSubmit={form.handleSubmit((v) => saveBranding.mutate(v))}
          className="mt-6 space-y-5 rounded-2xl border border-border bg-surface p-6"
        >
          <h2 className="font-display text-lg font-semibold">Identity</h2>

          <Field label="Site name" error={form.formState.errors.site_name?.message}>
            <Input {...form.register("site_name")} />
          </Field>
          <Field label="Tagline" error={form.formState.errors.tagline?.message}>
            <Input
              {...form.register("tagline")}
              placeholder="Short one-liner shown on the landing page"
            />
          </Field>
          <Field label="Logo wordmark" error={form.formState.errors.logo_text?.message}>
            <Input {...form.register("logo_text")} placeholder="Shown next to the logo mark" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Logo URL" error={form.formState.errors.logo_url?.message}>
              <Input {...form.register("logo_url")} placeholder="https://…" />
            </Field>
            <Field label="Favicon URL" error={form.formState.errors.favicon_url?.message}>
              <Input {...form.register("favicon_url")} placeholder="https://…" />
            </Field>
          </div>
          <Field label="Support email" error={form.formState.errors.support_email?.message}>
            <Input {...form.register("support_email")} placeholder="support@…" />
          </Field>
          <Field label="Footer text" error={form.formState.errors.footer_text?.message}>
            <Input {...form.register("footer_text")} />
          </Field>

          <h2 className="pt-4 font-display text-lg font-semibold">Theme</h2>
          <p className="-mt-3 text-xs text-muted-foreground">
            Colors accept any CSS value (oklch, hsl, hex). Leave blank to use the design-system
            default.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Primary" error={form.formState.errors.primary_color?.message}>
              <Input {...form.register("primary_color")} placeholder="oklch(0.36 0.13 268)" />
            </Field>
            <Field label="Secondary" error={form.formState.errors.secondary_color?.message}>
              <Input {...form.register("secondary_color")} placeholder="oklch(0.94 0.018 270)" />
            </Field>
            <Field label="Accent" error={form.formState.errors.accent_color?.message}>
              <Input {...form.register("accent_color")} placeholder="oklch(0.78 0.16 60)" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Heading font" error={form.formState.errors.font_heading?.message}>
              <Input {...form.register("font_heading")} placeholder="Fraunces" />
            </Field>
            <Field label="Body font" error={form.formState.errors.font_body?.message}>
              <Input {...form.register("font_body")} placeholder="Inter" />
            </Field>
            <Field label="Radius (rem)" error={form.formState.errors.radius_rem?.message}>
              <Input type="number" step="0.05" min="0" max="2" {...form.register("radius_rem")} />
            </Field>
          </div>

          <h2 className="pt-4 font-display text-lg font-semibold">SEO defaults</h2>
          <Field label="SEO title" error={form.formState.errors.seo_title?.message}>
            <Input {...form.register("seo_title")} />
          </Field>
          <Field label="SEO description" error={form.formState.errors.seo_description?.message}>
            <Textarea {...form.register("seo_description")} rows={3} />
          </Field>
          <Field label="Open Graph image URL" error={form.formState.errors.og_image_url?.message}>
            <Input {...form.register("og_image_url")} placeholder="https://… 1200x630" />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saveBranding.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveBranding.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
