import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { mcpSupabase } from "../supabase";

export default defineTool({
  name: "search_notes",
  title: "Search notes",
  description: "Search published study notes by keyword in title or summary.",
  inputSchema: {
    query: z.string().min(1).describe("Search text matched against note title and summary."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = mcpSupabase();
    const pattern = `%${query.replace(/[%_]/g, "")}%`;
    const { data, error } = await supabase
      .from("notes")
      .select("id, slug, title, summary, unit_id, updated_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .is("deleted_at", null)
      .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { notes: data ?? [] },
    };
  },
});
