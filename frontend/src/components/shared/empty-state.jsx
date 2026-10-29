import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        {Icon ? <Icon className="size-8 text-muted-foreground" aria-hidden /> : null}
        <div>
          <p className="font-medium">{title}</p>
          {body ? <p className="mt-1 text-sm text-muted-foreground">{body}</p> : null}
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
