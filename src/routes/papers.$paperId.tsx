import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileStack } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/papers/$paperId")({
  head: () => ({ meta: [{ title: "Question Paper · BCA Gurukul" }] }),
  component: PaperViewer,
});

function PaperViewer() {
  const { paperId } = Route.useParams();

  const paperQuery = useQuery({
    queryKey: ["public", "paper", paperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("id, title, year, exam_type, paper_number, description, file_path, file_bucket")
        .eq("id", paperId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!paperQuery.data?.file_path) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.storage
        .from(paperQuery.data!.file_bucket ?? "papers")
        .createSignedUrl(paperQuery.data!.file_path!, 60 * 60);
      if (!error && active) setPdfUrl(data?.signedUrl ?? null);
    })();
    return () => { active = false; };
  }, [paperQuery.data?.file_path, paperQuery.data?.file_bucket]);

  const recordDownload = async () => {
    if (!paperQuery.data?.id) return;
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("paper_downloads").insert({ paper_id: paperQuery.data.id, user_id: u.user.id });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>

        {paperQuery.data && (
          <article className="mt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <FileStack className="h-3.5 w-3.5" /> Previous-year paper
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold text-foreground">{paperQuery.data.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{paperQuery.data.year}</Badge>
              <Badge variant="outline">{paperQuery.data.exam_type.replace("_", " ")}</Badge>
              {paperQuery.data.paper_number && <Badge variant="outline">#{paperQuery.data.paper_number}</Badge>}
            </div>
            {paperQuery.data.description && (
              <p className="mt-4 max-w-3xl text-muted-foreground">{paperQuery.data.description}</p>
            )}

            {pdfUrl ? (
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-foreground">Paper</h2>
                  <a href={pdfUrl} target="_blank" rel="noreferrer" onClick={recordDownload}>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </a>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <iframe src={pdfUrl} title={paperQuery.data.title} className="h-[80vh] w-full" />
                </div>
              </section>
            ) : (
              <p className="mt-8 rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                No PDF attached for this paper yet.
              </p>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
