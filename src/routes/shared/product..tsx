import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/shared/product/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shared/product/"!</div>
}
