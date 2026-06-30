import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/quizzes/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/quizzes/"!</div>
}
