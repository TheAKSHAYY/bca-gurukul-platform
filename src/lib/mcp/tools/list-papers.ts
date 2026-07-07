import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { mcpSupabase } from "../supabase";

export default defineTool({
  name: "list_papers",
  title: "List past papers",
  description: "List published past exam papers, optionally filtered by exam type.",
  inputSchema: {
    examType: z.string().optional().describe("Optional exam type filter (e.g. 'midterm', 'final')."),
    limit: z.number().int().min(1).max(100).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ examType, limit }) => {
    const supabase = mcpSupabase();
    let q = supabase
      .from("papers")
      .select("id, exam_type, description, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (examType) q = q.eq("exam_type", examType);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { papers: data ?? [] },
    };
  },
});
