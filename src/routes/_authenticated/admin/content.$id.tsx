import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { getContent } from "@/lib/content.functions";
import { ContentEditor } from "@/components/admin/content-editor";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PageContainer } from "@/components/admin/ui/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/content/$id")({
  head: () => ({ meta: [{ title: "Edit content · Admin · BCA Gurukul" }] }),
  component: EditContentPage,
  errorComponent: ({ error }) => (
    <PageContainer width="narrow">
      <p className="text-sm text-destructive">{error.message}</p>
      <Button asChild size="sm" className="mt-4">
        <Link to="/admin/content">Back to content</Link>
      </Button>
    </PageContainer>
  ),
  notFoundComponent: () => (
    <PageContainer width="narrow" className="text-center">
      <p className="text-sm text-muted-foreground">Content not found.</p>
    </PageContainer>
  ),
});

function EditContentPage() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getContent);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", "one", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  return (
    <PageContainer width="narrow">
      <PageHeader
        title={data?.title ?? "Content"}
        description="Edit metadata, replace the file, or change visibility."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/content"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <ContentEditor initialType={data.type} initial={data} contentId={id} />
      )}
    </PageContainer>
  );
}
