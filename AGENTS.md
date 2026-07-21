<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Routing conventions

### Admin list+detail routes

When an admin route needs both a list view and a detail view (e.g. `/admin/foo`
and `/admin/foo/$id`), always name the list file `foo.index.tsx`, never a bare
`foo.tsx`. A bare `foo.tsx` alongside `foo.$id.tsx` becomes an implicit parent
layout route requiring `<Outlet />` to render children — if forgotten, the detail
route silently fails to render (URL changes, no error, nothing displays). This
bug has already occurred twice (`content.tsx`, `courses.tsx`). Use `.index.tsx`
naming for all future list+detail admin pages instead of patching around it with
manual `Outlet` checks.

