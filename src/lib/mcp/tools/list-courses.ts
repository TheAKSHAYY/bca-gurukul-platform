import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { mcpSupabase } from "../supabase";

export default defineTool({
  name: "list_courses",
  title: "List courses",
  description: "List published BCA Gurukul courses with code, title, and slug.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(50).describe("Max courses to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = mcpSupabase();
    const { data, error } = await supabase
      .from("courses")
      .select("id, code, slug, description, duration_years, sort_order")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
