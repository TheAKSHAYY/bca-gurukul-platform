import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, LifeBuoy, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({ meta: [{ title: "Help & support · BCA Gurukul" }] }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <h1 className="font-display text-2xl font-semibold text-foreground">Help &amp; support</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card icon={HelpCircle} title="Getting started" body="Tour the dashboard, search and your bookmarks." to="/dashboard" />
        <Card icon={MessageCircle} title="Contact a teacher" body="Reach out from any unit page." to="/courses" />
        <Card icon={Mail} title="Email support" body="We'll get back within 1 business day." href="mailto:support@bcagurukul.app" />
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  body,
  to,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  to?: string;
  href?: string;
}) {
  const inner = (
    <div className="h-full rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-muted">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
  if (href) {
    return <a href={href}>{inner}</a>;
  }
  return <Link to={to!}>{inner}</Link>;
}
