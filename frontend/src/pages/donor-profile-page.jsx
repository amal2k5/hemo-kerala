import { useEffect, useState } from "react"
import { CalendarClock, HeartHandshake, Info, ShieldCheck, ShieldAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { DonorProfileForm } from "@/features/donors/profile-form"
import {
  createDonorProfile,
  fetchDonorProfile,
  updateAvailability,
  updateDonorProfile,
} from "@/features/donors/donor-service"
import { ApiError } from "@/lib/api-client"
import { formatDate, formatDateTime } from "@/lib/format"
import { PageShell } from "@/components/layout/page-shell"
import { AvailabilityBadge } from "@/components/shared/status-badge"
import { BloodGroupBadge } from "@/components/shared/blood-group-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { CenteredLoader } from "@/components/shared/centered-loader"
import { LoadError } from "@/components/shared/load-error"
import { FieldShell } from "@/components/shared/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AVAILABILITY_STATUSES } from "@/components/shared/constants"

export function DonorProfilePage() {
  const { t } = useTranslation()
  const [state, setState] = useState({ status: "loading", profile: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let cancelled = false
    fetchDonorProfile()
      .then((profile) => {
        if (!cancelled) setState({ status: "ready", profile, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "missing", profile: null, error: null })
        } else {
          setState({ status: "error", profile: null, error: error.detail || t("common.error") })
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt, t])

  const profile = state.profile

  function reload() {
    setState((prev) => ({ ...prev, status: "loading", error: null }))
    setAttempt((n) => n + 1)
  }

  async function handleCreate(values) {
    setSaving(true)
    setFieldErrors({})
    try {
      await createDonorProfile(values)
      toast.success(t("donors.created"))
      reload()
    } catch (error) {
      handleSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(values) {
    setSaving(true)
    setFieldErrors({})
    try {
      await updateDonorProfile(values, profile)
      toast.success(t("donors.updated"))
      reload()
    } catch (error) {
      handleSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  function handleSaveError(error) {
    if (error instanceof ApiError) {
      setFieldErrors(error.fields)
      toast.error(error.detail)
    } else {
      toast.error(t("common.error"))
    }
  }

  async function handleAvailabilityChange(status) {
    if (!profile || status === profile.availability_status) return
    try {
      await updateAvailability(status)
      toast.success(t("donors.availabilityUpdated"))
      reload()
    } catch (error) {
      toast.error(error.detail || t("common.error"))
    }
  }

  if (state.status === "loading") {
    return (
      <PageShell title={t("donors.profileTitle")}>
        <CenteredLoader />
      </PageShell>
    )
  }

  if (state.status === "error") {
    return (
      <PageShell title={t("donors.profileTitle")}>
        <LoadError message={state.error} onRetry={reload} />
      </PageShell>
    )
  }

  if (!profile) {
    return (
      <PageShell title={t("donors.createTitle")} subtitle={t("donors.createSubtitle")}>
        <EmptyState
          icon={HeartHandshake}
          title={t("donors.noProfile")}
          body={t("donors.noProfileBody")}
        />
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("donors.createTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonorProfileForm
              pending={saving}
              fieldErrors={fieldErrors}
              onSubmit={handleCreate}
              submitLabel={t("donors.createAction")}
            />
          </CardContent>
        </Card>
        <SelfReportedNotice />
      </PageShell>
    )
  }

  return (
    <PageShell title={t("donors.profileTitle")} subtitle={t("donors.profileSubtitle")}>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("donors.profileTitle")}</span>
              <BloodGroupBadge group={profile.blood_group} />
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <AvailabilityBadge status={profile.availability_status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <dl className="flex flex-col gap-2">
              <DetailRow label={t("donors.district")} value={profile.district?.name} />
              <DetailRow label={t("donors.localBody")} value={profile.local_body?.name} />
              <DetailRow label={t("donors.locality")} value={profile.locality} />
              <DetailRow
                label={t("donors.contactVerified")}
                value={
                  profile.contact_verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="size-4" aria-hidden /> {t("donors.contactVerified")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <ShieldAlert className="size-4" aria-hidden /> {t("donors.notVerified")}
                    </span>
                  )
                }
              />
              <DetailRow label={t("donors.memberSince")} value={formatDate(profile.created_at)} />
              <DetailRow label={t("donors.lastUpdated")} value={formatDateTime(profile.updated_at)} />
            </dl>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="font-medium">{t("donors.availabilityTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("donors.availabilityHint")}</p>
              <FieldShell label={t("donors.availability")} htmlFor="availability-quick">
                <Select value={profile.availability_status} onValueChange={handleAvailabilityChange}>
                  <SelectTrigger id="availability-quick">
                    <SelectValue placeholder={t("locations.selectAvailability")} />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`availabilityStatuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("donors.profileTitle")}</CardTitle>
            <CardDescription>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-4" aria-hidden />
                {t("donors.lastUpdated")}: {formatDateTime(profile.updated_at)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DonorProfileForm
              initial={profile}
              pending={saving}
              fieldErrors={fieldErrors}
              onSubmit={handleUpdate}
              submitLabel={t("donors.save")}
            />
          </CardContent>
        </Card>
      </div>
      <SelfReportedNotice />
    </PageShell>
  )
}

function DetailRow({ label, value }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">
        {value ?? <span className="text-muted-foreground">{t("common.notProvided")}</span>}
      </dd>
    </div>
  )
}

function SelfReportedNotice() {
  const { t } = useTranslation()
  return (
    <Alert className="mt-6">
      <Info className="size-4" aria-hidden />
      <AlertDescription>{t("donors.selfReportedNote")}</AlertDescription>
    </Alert>
  )
}
