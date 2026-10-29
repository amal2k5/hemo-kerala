import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Building2, CalendarDays, ExternalLink, FileX2, Info, Mail, MapPin, Phone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"

import { fetchBloodBank } from "@/features/blood-banks/bank-service"
import { ApiError } from "@/lib/api-client"
import { formatDate, formatDateTime } from "@/lib/format"
import { PageShell } from "@/components/layout/page-shell"
import { CenteredLoader } from "@/components/shared/centered-loader"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadError } from "@/components/shared/load-error"
import { VerificationBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BloodBankDetailPage() {
  const { t } = useTranslation()
  const { bankId } = useParams()
  const [bank, setBank] = useState(null)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchBloodBank(bankId)
      .then((data) => {
        if (!cancelled) {
          setBank(data)
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
  }, [bankId, attempt, t])

  const load = useCallback(() => {
    setError(null)
    setNotFound(false)
    setAttempt((n) => n + 1)
  }, [])

  if (notFound) {
    return (
      <PageShell title={t("banks.detailNotFound")}>
        <EmptyState
          icon={FileX2}
          title={t("banks.detailNotFound")}
          action={
            <Button variant="outline" asChild>
              <Link to="/blood-banks">
                <ArrowLeft className="size-4" aria-hidden />
                {t("banks.backToDirectory")}
              </Link>
            </Button>
          }
        />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title={t("banks.title")}>
        <LoadError message={error} onRetry={load} />
      </PageShell>
    )
  }

  if (!bank) {
    return (
      <PageShell title={t("banks.title")}>
        <CenteredLoader />
      </PageShell>
    )
  }

  return (
    <PageShell
      title={bank.name}
      subtitle={`${bank.district.name}${bank.locality ? ` · ${bank.locality}` : ""}`}
      actions={
        <Button variant="ghost" asChild>
          <Link to="/blood-banks">
            <ArrowLeft className="size-4" aria-hidden />
            {t("banks.backToDirectory")}
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" aria-hidden />
                {bank.name}
              </span>
              <VerificationBadge status={bank.verification_status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label={t("banks.address")} value={bank.address} icon={MapPin} />
              <Detail label={t("banks.locality")} value={bank.locality} icon={MapPin} />
              <Detail
                label={t("banks.phone")}
                value={
                  bank.public_phone ? (
                    <a href={`tel:${bank.public_phone}`} className="underline-offset-4 hover:underline">
                      {bank.public_phone}
                    </a>
                  ) : undefined
                }
                icon={Phone}
              />
              <Detail
                label={t("banks.email")}
                value={
                  bank.public_email ? (
                    <a href={`mailto:${bank.public_email}`} className="underline-offset-4 hover:underline">
                      {bank.public_email}
                    </a>
                  ) : undefined
                }
                icon={Mail}
              />
              <Detail
                label={t("banks.verifiedOn")}
                value={bank.verification_date ? formatDate(bank.verification_date) : undefined}
                icon={CalendarDays}
              />
              <Detail label={t("banks.lastUpdated")} value={formatDateTime(bank.last_updated_at)} icon={CalendarDays} />
            </dl>
            <p className="text-muted-foreground">{t(`banks.verificationHint.${bank.verification_status}`)}</p>
            {bank.source_url ? (
              <p className="flex items-center gap-2">
                <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-muted-foreground">{t("banks.source")}:</span>
                <a
                  href={bank.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary underline-offset-4 hover:underline"
                >
                  {bank.source_url}
                </a>
              </p>
            ) : null}
            {!bank.public_phone && !bank.public_email ? (
              <p className="text-muted-foreground">{t("banks.noContact")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>{t("banks.stockNote")}</AlertDescription>
        </Alert>
      </div>
    </PageShell>
  )
}

function Detail({ label, value, icon: Icon }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {label}
      </span>
      <dd className="font-medium">
        {value ?? <span className="font-normal text-muted-foreground">{t("common.notProvided")}</span>}
      </dd>
    </div>
  )
}
