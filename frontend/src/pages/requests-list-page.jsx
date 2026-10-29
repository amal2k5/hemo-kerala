import { useCallback, useEffect, useState } from "react"
import { Droplets, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { listActiveRequests } from "@/features/requests/request-service"
import { ApiError } from "@/lib/api-client"
import { PageShell } from "@/components/layout/page-shell"
import { CenteredLoader } from "@/components/shared/centered-loader"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadError } from "@/components/shared/load-error"
import { Button } from "@/components/ui/button"
import { RequestCard } from "@/features/requests/request-card"

export function RequestsListPage() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // State changes happen only in the fetch callbacks; `attempt` drives retries.
  useEffect(() => {
    let cancelled = false
    listActiveRequests()
      .then((data) => {
        if (!cancelled) {
          setRequests(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.detail : t("common.error"))
      })
    return () => {
      cancelled = true
    }
  }, [attempt, t])

  const load = useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <PageShell
      title={t("requests.title")}
      subtitle={t("requests.subtitle")}
      actions={
        <Button asChild>
          <Link to="/requests/new">
            <Plus className="size-4" aria-hidden />
            {t("requests.create")}
          </Link>
        </Button>
      }
    >
      {error ? <LoadError message={error} onRetry={load} /> : null}
      {!error && requests === null ? <CenteredLoader /> : null}
      {!error && requests !== null && requests.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title={t("requests.empty")}
          body={t("requests.emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link to="/requests/new">{t("requests.create")}</Link>
            </Button>
          }
        />
      ) : null}
      {!error && requests !== null && requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : null}
    </PageShell>
  )
}
