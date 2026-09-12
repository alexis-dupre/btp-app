import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
          <div className="mt-4 flex gap-2">
            <span className="text-status-success bg-status-success-bg rounded-md px-2 py-1">Accepté</span>
            <span className="text-status-warning bg-status-warning-bg rounded-md px-2 py-1">En attente</span>
            <span className="text-status-danger bg-status-danger-bg rounded-md px-2 py-1">Refusé</span>
            <span className="text-status-info bg-status-info-bg rounded-md px-2 py-1">Brouillon</span>
          </div>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}