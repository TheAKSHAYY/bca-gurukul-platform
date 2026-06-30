import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/courses", changefreq: "weekly", priority: "0.9" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];

        // Published courses → /courses/:slug
        const { data: courses } = await supabase
          .from("courses")
          .select("slug, updated_at")
          .eq("status", "published")
          .is("deleted_at", null);
        for (const c of courses ?? []) {
          if (!c.slug) continue;
          entries.push({
            path: `/courses/${c.slug}`,
            lastmod: c.updated_at ?? undefined,
            changefreq: "weekly",
            priority: "0.8",
          });
        }

        // Published notes → /notes/:id
        const { data: notes } = await supabase
          .from("notes")
          .select("id, updated_at")
          .eq("status", "published")
          .is("deleted_at", null)
          .limit(5000);
        for (const n of notes ?? []) {
          entries.push({
            path: `/notes/${n.id}`,
            lastmod: n.updated_at ?? undefined,
            changefreq: "monthly",
            priority: "0.6",
          });
        }

        // Published papers
        const { data: papers } = await supabase
          .from("papers")
          .select("id, updated_at")
          .eq("status", "published")
          .is("deleted_at", null)
          .limit(5000);
        for (const p of papers ?? []) {
          entries.push({
            path: `/papers/${p.id}`,
            lastmod: p.updated_at ?? undefined,
            changefreq: "monthly",
            priority: "0.5",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
