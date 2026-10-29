import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, CalendarClock, FileX2, MapPin, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"

import { fetchRequest } from "@/features/requests/request-service"
import { ApiError } from "@/lib/api-client"
import { formatDateTime, isPastDeadline } from "@/lib/format"
import { PageShell } from "@/components/layout/page-shell"
import { CenteredLoader } from "@/components/shared/centered-loader"
import { LoadError } from "@/components/shared/load-error"
import { EmptyState } from "@/components/shared/empty-state"
import { BloodGroupBadge } from "@/components/shared/blood-group-badge"
import { RequestStatusBadge } from "@/components/shared/status-badge"
import { OwnerActions } from "@/features/requests/owner-actions"
import { ResponsesPanel } from "@/features/responses/responses-panel"
import { MatchesPanel } from "@/features/matching/matches-panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function RequestDetailPage() {
  const { t } = useTranslation()
  const { requestId } = useParams()
  const [request, setRequest] = useState(null)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchRequest(requestId)
      .then((data) => {
        if (!cancelled) {
          setRequest(data)
          setError(null)
          setNotFound(false)
        }
      })
      .catch((e) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true)
        } else {
          setError(e.detail || t("common.error"))
        }
      })
    return () => {
      cancelled = true
    }
  }, [requestId, attempt, t])

  const load = useCallback(() => {
    setError(null)
    setNotFound(false)
    setAttempt((n) => n + 1)
  }, [])

  /** Re-fetch in place (no loader flash) after actions that may move the
   * request's status server-side, such as a donor accepting. */
  const refresh = useCallback(() => {
    fetchRequest(requestId)
      .then(setRequest)
      .catch(() => {})
  }, [requestId])

  if (notFound) {
    return (
      <PageShell title={t("requests.detailNotFound")}>
        <EmptyState
          icon={FileX2}
          title={t("requests.detailNotFound")}
          action={
            <Button variant="outline" asChild>
              <Link to="/requests">
                <ArrowLeft className="size-4" aria-hidden />
                {t("requests.backToList")}
              </Link>
            </Button>
          }
        />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title={t("requests.title")}>
        <LoadError message={error} onRetry={load} />
      </PageShell>
    )
  }

  if (!request) {
    return (
      <PageShell title={t("requests.title")}>
        <CenteredLoader />
      </PageShell>
    )
  }

  const deadlinePassed = isPastDeadline(request.required_by)

  return (
    <PageShell
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <BloodGroupBadge group={request.blood_group} />
          {t(`components.${request.component}`)}
          <RequestStatusBadge status={request.status} />
        </span>
      }
      actions={
        <Button variant="ghost" asChild>
          <Link to="/requests">
            <ArrowLeft className="size-4" aria-hidden />
            {t("requests.backToList")}
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label={t("requests.district")} value={request.locality ? `${request.district.name} · ${request.locality}` : request.district.name} icon={MapPin} />
            <Detail label={t("requests.requiredBy")} value={formatDateTime(request.required_by)} icon={CalendarClock} />
            <Detail label={t("requests.postedOn")} value={formatDateTime(request.created_at)} icon={CalendarClock} />
            <Detail label={t("requests.status")} value={t(`requestStatuses.${request.status}`)} icon={null} />
          </CardContent>
        </Card>

        {deadlinePassed ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden />
            <AlertDescription>{t("requests.deadlinePassed")}</AlertDescription>
          </Alert>
        ) : null}

        {request.is_owner ? (
          <>
            <OwnerActions request={request} onUpdated={setRequest} />
            <Tabs defaultValue="responses">
              <TabsList>
                <TabsTrigger value="responses">{t("responses.title")}</TabsTrigger>
                <TabsTrigger value="matches">{t("matching.title")}</TabsTrigger>
              </TabsList>
              <TabsContent value="responses" className="mt-4">
                <ResponsesPanel request={request} onStatusChange={refresh} />
              </TabsContent>
              <TabsContent value="matches" className="mt-4">
                <MatchesPanel requestId={request.id} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <ResponsesPanel request={request} onStatusChange={refresh} />
        )}
      </div>
    </PageShell>
  )
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
