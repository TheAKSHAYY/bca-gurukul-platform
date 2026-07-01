import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5, "Tell me a little more").max(5000),
});

export function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          if (issue.path[0]) e[String(issue.path[0])] = issue.message;
        }
        setErrors(e);
        throw new Error("Please fix the highlighted fields.");
      }
      setErrors({});
      const { error } = await supabase.from("contact_messages").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject || null,
        message: parsed.data.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(true);
      setValues({ name: "", email: "", subject: "", message: "" });
      toast.success("Message sent — I'll get back to you soon.");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send message"),
  });

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center animate-scale-in">
        <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
        <h3 className="mt-4 font-display text-xl font-semibold">Thanks for reaching out!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your message landed in my inbox. Expect a reply within a couple of days.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => setDone(false)}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
      className="rounded-2xl border border-border bg-surface p-6 text-left shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          value={values.name}
          onChange={(v) => setValues((s) => ({ ...s, name: v }))}
          error={errors.name}
          placeholder="Akshay Sharma"
          autoComplete="name"
        />
        <Field
          label="Email"
          type="email"
          value={values.email}
          onChange={(v) => setValues((s) => ({ ...s, email: v }))}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div className="mt-4">
        <Field
          label="Subject"
          value={values.subject}
          onChange={(v) => setValues((s) => ({ ...s, subject: v }))}
          error={errors.subject}
          placeholder="Project, collaboration, hello…"
        />
      </div>
      <div className="mt-4">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Message
        </Label>
        <Textarea
          value={values.message}
          onChange={(e) => setValues((s) => ({ ...s, message: e.target.value }))}
          placeholder="What's on your mind?"
          rows={5}
          className="mt-1.5"
        />
        {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">No spam — just a friendly developer.</p>
        <Button type="submit" disabled={mut.isPending} size="lg">
          {mut.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          Send message
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
