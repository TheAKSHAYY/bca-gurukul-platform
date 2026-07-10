import { defineMcp, auth } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list-courses";
import searchNotes from "./tools/search-notes";
import listPapers from "./tools/list-papers";

// Server-only: read the Supabase project URL from the runtime env so we can
// point the MCP OAuth issuer at the project's GoTrue instance. Falls back to
// the VITE-prefixed value that Vite inlines at build time when the raw server
// var is unset (e.g. during `vite build`).
const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  import.meta.env?.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "MCP auth: SUPABASE_URL (or VITE_SUPABASE_URL) must be set to enable OAuth on /mcp",
  );
}

const issuer = `${supabaseUrl.replace(/\/+$/, "")}/auth/v1`;

export default defineMcp({
  name: "bca-gurukul-mcp",
  title: "BCA Gurukul",
  version: "0.1.0",
  instructions:
    "Read-only access to BCA Gurukul learning content: courses, published study notes, and past exam papers.",
  tools: [listCourses, searchNotes, listPapers],
  // Require a valid Supabase-issued access token on every MCP request.
  // Without this, the /mcp endpoint is publicly callable once the site ships.
  auth: auth.oauth.issuer({
    issuer,
    jwksUri: `${issuer}/.well-known/jwks.json`,
    acceptedAudiences: ["authenticated"],
    resourceName: "BCA Gurukul MCP",
  }),
});
