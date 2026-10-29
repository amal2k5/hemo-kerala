import { Badge } from "@/components/ui/badge"

/** Blood groups are universal clinical notation (A+, O-, …) and are not
 * translated; the badge gives them a consistent, recognizable identity. */
export function BloodGroupBadge({ group, className = "" }) {
  return (
    <Badge
      className={`bg-primary/10 text-primary border-primary/30 font-semibold ${className}`}
      variant="outline"
    >
      {group}
    </Badge>
  )
}
