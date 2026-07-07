import { defineMcp } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list-courses";
import searchNotes from "./tools/search-notes";
import listPapers from "./tools/list-papers";

export default defineMcp({
  name: "bca-gurukul-mcp",
  title: "BCA Gurukul",
  version: "0.1.0",
  instructions:
    "Read-only access to BCA Gurukul learning content: courses, published study notes, and past exam papers.",
  tools: [listCourses, searchNotes, listPapers],
});
