import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/account/audit-logs')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/account/audit-logs"!</div>
}
