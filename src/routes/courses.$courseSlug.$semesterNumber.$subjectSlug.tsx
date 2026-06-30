import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/courses/$courseSlug/$semesterNumber/$subjectSlug")({
  head: () => ({ meta: [{ title: "Subject · BCA Gurukul" }] }),
  component: () => <Outlet />,
});
