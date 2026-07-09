import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/notes")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/content" });
  },
});
