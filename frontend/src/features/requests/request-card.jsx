import { Clock, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { formatDateTime, isPastDeadline } from "@/lib/format"
import { BloodGroupBadge } from "@/components/shared/blood-group-badge"
import { RequestStatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/** Compact card for a blood request as shown in the active list. */
export function RequestCard({ request }) {
  const { t } = useTranslation()
  const deadlinePassed = isPastDeadline(request.required_by)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <BloodGroupBadge group={request.blood_group} className="text-sm" />
          <span className="text-sm font-medium">{t(`components.${request.component}`)}</span>
        </div>
        <RequestStatusBadge status={request.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {request.locality ? `${request.district.name} · ${request.locality}` : request.district.name}
          </span>
          <span className={`inline-flex items-center gap-1 ${deadlinePassed ? "font-medium text-destructive" : ""}`}>
            <Clock className="size-4" aria-hidden />
            {t("requests.requiredBy")}: {formatDateTime(request.required_by)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("requests.postedOn")} {formatDateTime(request.created_at)}
          </span>
          <Link
            to={`/requests/${request.id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("requests.viewDetails")}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
