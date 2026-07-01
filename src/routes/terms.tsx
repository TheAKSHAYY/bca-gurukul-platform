import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use · BCA Gurukul" },
      { name: "description", content: "The terms that govern your use of BCA Gurukul." },
      { property: "og:title", content: "Terms of Use · BCA Gurukul" },
      { property: "og:description", content: "The terms that govern your use of BCA Gurukul." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="mt-6 font-display text-4xl font-semibold text-foreground">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 30 June 2026</p>

        <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
          <h2>Who can use BCA Gurukul</h2>
          <p>
            BCA Gurukul is free for students enrolled in or preparing for a Bachelor of Computer
            Applications programme. You must provide accurate information when you sign up.
          </p>

          <h2>Your account</h2>
          <p>
            You're responsible for keeping your login credentials safe. Don't share your account,
            and let us know immediately if you suspect unauthorised access.
          </p>

          <h2>Content</h2>
          <p>
            Notes, past papers and quizzes published on BCA Gurukul are for personal study. Don't
            redistribute, resell, or claim ownership of the material.
          </p>

          <h2>Acceptable use</h2>
          <p>
            No scraping, no automated abuse, no attempts to bypass quizzes or tamper with other
            students' data. We may suspend accounts that violate these rules.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms as the product evolves. Material changes will be announced on
            the dashboard before they take effect.
          </p>

          <h2>Contact</h2>
          <p>
            Questions or disputes? Email{" "}
            <a href="mailto:hello@bcagurukul.in">hello@bcagurukul.in</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
