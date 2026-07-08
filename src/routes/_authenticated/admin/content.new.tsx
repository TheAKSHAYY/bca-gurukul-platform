import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { ContentEditor } from "@/components/admin/content-editor";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  type: z.enum(["note", "pdf", "ppt", "video", "assignment", "link"]).optional(),
});

export const Route = createFileRoute("/_authenticated/admin/content/new")({
  head: () => ({ meta: [{ title: "New content · Admin · BCA Gurukul" }] }),
  validateSearch: searchSchema,
  component: NewContentPage,
});

function NewContentPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/admin/content/new" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="New content"
        description="Pick a type and fill in the details. Save as draft or publish."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/content"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <ContentEditor
        initialType={search.type ?? "note"}
        onSaved={(id) => navigate({ to: "/admin/content/$id", params: { id } })}
      />
    </div>
  );
}
