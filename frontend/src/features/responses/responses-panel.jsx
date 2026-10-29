import { useCallback, useEffect, useState } from "react"
import { HandHeart, Inbox, Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

import {
  listResponses,
  submitResponse,
  updateResponseStatus,
} from "@/features/responses/response-service"
import { fetchDonorProfile } from "@/features/donors/donor-service"
import { ApiError } from "@/lib/api-client"
import { formatDateTime } from "@/lib/format"
import { ACTIVE_REQUEST_STATUSES, RESPONSE_STATUS_TRANSITIONS } from "@/components/shared/constants"
import { CenteredLoader } from "@/components/shared/centered-loader"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadError } from "@/components/shared/load-error"
import { ResponseStatusBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Panel on the request detail page.
 * - Requester: sees every response's status (never donor identities — the
 *   API does not return them).
 * - Donor: sees their own response and can move it through the statuses the
 *   backend allows. Accepting does not auto-fulfil the request.
 */
export function ResponsesPanel({ request, onStatusChange }) {
  const { t } = useTranslation()
  const isOwner = request.is_owner
  const isActive = ACTIVE_REQUEST_STATUSES.includes(request.status)

  const [responses, setResponses] = useState(null)
  const [error, setError] = useState(null)
  const [donorProfileExists, setDonorProfileExists] = useState(null)
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Which consequential action is awaiting confirmation: "respond" | "accept" | "decline" | "withdraw" | null
  const [confirming, setConfirming] = useState(null)

  const ownResponse = responses?.find((response) => response.is_owner) || null

  // State changes happen only in fetch callbacks; `attempt` drives retries.
  useEffect(() => {
    let cancelled = false
    listResponses(request.id)
      .then((data) => {
        if (!cancelled) {
          setResponses(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.detail || t("responses.loadFailed"))
      })
    return () => {
      cancelled = true
    }
  }, [request.id, attempt, t])

  const load = useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    if (isOwner) return undefined
    let cancelled = false
    fetchDonorProfile()
      .then(() => {
        if (!cancelled) setDonorProfileExists(true)
      })
      .catch((e) => {
        if (!cancelled) setDonorProfileExists(e.status === 404 ? false : null)
      })
    return () => {
      cancelled = true
    }
  }, [isOwner])

  const ACTION_SUCCESS_KEYS = {
    accept: "responses.accepted",
    decline: "responses.declined",
    withdraw: "responses.withdrawn",
  }

  async function runAction(action) {
    setPending(true)
    try {
      if (action === "respond") {
        await submitResponse(request.id)
        toast.success(t("responses.submitted"))
      } else {
        const statusMap = { accept: "accepted", decline: "declined", withdraw: "withdrawn" }
        await updateResponseStatus(request.id, ownResponse.id, statusMap[action])
        toast.success(t(ACTION_SUCCESS_KEYS[action]))
      }
      setConfirming(null)
      await listResponses(request.id).then(setResponses)
      onStatusChange?.()
    } catch (e) {
      setConfirming(null)
      const detail = e instanceof ApiError ? e.detail : t("responses.updateFailed")
      toast.error(detail)
      // A 409 here typically means the donor already responded in another
      // tab — refresh so the UI reflects reality.
      if (e instanceof ApiError && e.status === 409) {
        await listResponses(request.id).then(setResponses)
        onStatusChange?.()
      }
    } finally {
      setPending(false)
    }
  }

  const title = isOwner ? t("responses.title") : t("responses.yourResponse")

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {isOwner ? <CardDescription>{t("responses.anonymityNote")}</CardDescription> : null}
        </div>
        {!isOwner && donorProfileExists && isActive && !ownResponse ? (
          <Button onClick={() => setConfirming("respond")}>
            <HandHeart className="size-4" aria-hidden />
            {t("responses.respond")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isOwner && donorProfileExists === false ? (
          <Alert>
            <Info className="size-4" aria-hidden />
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>{t("responses.needDonorProfile")}</span>
              <Button size="sm" variant="outline" asChild>
                <Link to="/donors/profile">{t("responses.createDonorProfile")}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!isOwner && donorProfileExists && !isActive ? (
          <Alert>
            <Info className="size-4" aria-hidden />
            <AlertDescription>{t("responses.closed")}</AlertDescription>
          </Alert>
        ) : null}

        {error ? <LoadError message={error} onRetry={load} /> : null}
        {!error && responses === null ? <CenteredLoader /> : null}

        {!error && responses !== null && isOwner && responses.length === 0 ? (
          <EmptyState icon={Inbox} title={t("responses.emptyOwner")} body={t("responses.emptyOwnerBody")} />
        ) : null}

        {!error && responses !== null && responses.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requests.status")}</TableHead>
                  <TableHead>{t("requests.postedOn")}</TableHead>
                  <TableHead>{t("donors.lastUpdated")}</TableHead>
                  {!isOwner ? <TableHead className="text-right"> </TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell>
                      <ResponseStatusBadge status={response.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(response.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(response.updated_at)}</TableCell>
                    {!isOwner && response.is_owner ? (
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {RESPONSE_STATUS_TRANSITIONS[response.status]?.map((target) => (
                            <Button
                              key={target}
                              size="sm"
                              variant={target === "accepted" ? "default" : "outline"}
                              disabled={pending}
                              onClick={() =>
                                setConfirming(
                                  target === "accepted" ? "accept" : target === "declined" ? "decline" : "withdraw",
                                )
                              }
                            >
                              {actionLabel(target, t)}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirming !== null}
          onOpenChange={(open) => {
            if (!open) setConfirming(null)
          }}
          title={confirmTitle(confirming, t)}
          body={confirmBody(confirming, t)}
          pending={pending}
          destructive={confirming === "withdraw" || confirming === "decline"}
          confirmLabel={
            confirming === "respond"
              ? t("responses.respond")
              : confirming === "accept"
                ? t("responses.accept")
                : confirming === "decline"
                  ? t("responses.decline")
                  : t("responses.withdraw")
          }
          onConfirm={() => runAction(confirming)}
        />
      </CardContent>
    </Card>
  )
}

function actionLabel(target, t) {
  if (target === "accepted") return t("responses.accept")
  if (target === "declined") return t("responses.decline")
  return t("responses.withdraw")
}

function confirmTitle(action, t) {
  if (action === "respond") return t("responses.respondTitle")
  if (action === "accept") return t("responses.accept")
  if (action === "decline") return t("responses.decline")
  if (action === "withdraw") return t("responses.withdrawTitle")
  return ""
}

function confirmBody(action, t) {
  if (action === "respond") return t("responses.respondBody")
  if (action === "accept") return t("responses.acceptBody")
  if (action === "decline") return t("responses.declineBody")
  if (action === "withdraw") return t("responses.withdrawBody")
  return ""
}
