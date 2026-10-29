import { useEffect, useState } from "react"
import { Building2, Info, MapPin, Phone, Search, SearchX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { listBloodBanks } from "@/features/blood-banks/bank-service"
import { listDistricts } from "@/features/locations/location-service"
import { LocationPicker } from "@/features/locations/location-picker"
import { ApiError } from "@/lib/api-client"
import { formatDate } from "@/lib/format"
import { PageShell } from "@/components/layout/page-shell"
import { CenteredLoader } from "@/components/shared/centered-loader"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadError } from "@/components/shared/load-error"
import { VerificationBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VERIFICATION_STATUSES } from "@/components/shared/constants"

/** Radius choices for the nearby filter; the backend caps it at 100 km. */
const BANK_RADIUS_OPTIONS = [2, 5, 10, 25, 50, 100]

export function BloodBanksListPage() {
  const { t } = useTranslation()
  const [banks, setBanks] = useState(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(null)
  const [districts, setDistricts] = useState([])
  const [filters, setFilters] = useState({
    district_id: "",
    verification_status: "",
    location: null,
    radius_km: "10",
  })
  // Applied snapshot: nearby coordinates only take effect on "Apply" so
  // partial coordinate input doesn't fire half-formed requests.
  const [applied, setApplied] = useState({
    districtId: undefined,
    verificationStatus: undefined,
    nearby: null,
    version: 0,
  })

  // State changes happen in fetch callbacks and filter handlers only.
  useEffect(() => {
    let cancelled = false
    listBloodBanks({
      districtId: applied.districtId,
      verificationStatus: applied.verificationStatus,
      latitude: applied.nearby?.latitude,
      longitude: applied.nearby?.longitude,
      radiusKm: applied.nearby?.radius_km,
    })
      .then((data) => {
        if (!cancelled) {
          setBanks(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.detail : t("common.error"))
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [applied, t])

  function applyFilters(next) {
    setPending(true)
    setApplied((prev) => ({ ...next, version: prev.version + 1 }))
  }

  useEffect(() => {
    let cancelled = false
    listDistricts()
      .then((data) => {
        if (!cancelled) setDistricts(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function changeFilter(field, value) {
    const next = {
      districtId: applied.districtId,
      verificationStatus: applied.verificationStatus,
      nearby: applied.nearby,
    }
    if (field === "district_id") next.districtId = value || undefined
    if (field === "verification_status") next.verificationStatus = value || undefined
    applyFilters(next)
  }

  function applyNearby(event) {
    event.preventDefault()
    applyFilters({
      districtId: applied.districtId,
      verificationStatus: applied.verificationStatus,
      nearby: filters.location
        ? { latitude: filters.location.latitude, longitude: filters.location.longitude, radius_km: Number(filters.radius_km) || 10 }
        : null,
    })
  }

  function resetNearby() {
    setFilters((prev) => ({ ...prev, location: null }))
    applyFilters({ districtId: applied.districtId, verificationStatus: applied.verificationStatus, nearby: null })
  }

  const hasNearby = applied.nearby !== null

  return (
    <PageShell title={t("banks.title")} subtitle={t("banks.subtitle")}>
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("banks.districtFilter")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label htmlFor="bank-district-filter" className="mb-1.5 block text-sm font-medium">
                {t("banks.districtFilter")}
              </label>
              <Select
                value={filters.district_id || undefined}
                onValueChange={(v) => changeFilter("district_id", v === "__all__" ? "" : v)}
              >
                <SelectTrigger id="bank-district-filter">
                  <SelectValue placeholder={t("banks.allDistricts")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("banks.allDistricts")}</SelectItem>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={String(district.id)}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="bank-verification-filter" className="mb-1.5 block text-sm font-medium">
                {t("banks.verificationFilter")}
              </label>
              <Select
                value={filters.verification_status || undefined}
                onValueChange={(v) => changeFilter("verification_status", v === "__all__" ? "" : v)}
              >
                <SelectTrigger id="bank-verification-filter">
                  <SelectValue placeholder={t("banks.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("banks.allStatuses")}</SelectItem>
                  {VERIFICATION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`banks.verificationLevels.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" aria-hidden />
              {t("banks.nearbyTitle")}
            </CardTitle>
            <CardDescription>{t("banks.nearbyHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={applyNearby} className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">{t("banks.nearbyHint")}</p>
              <LocationPicker
                value={filters.location}
                onChange={(v) => setFilters((prev) => ({ ...prev, location: v }))}
              />
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <label htmlFor="bank-radius" className="mb-1.5 block text-sm font-medium">
                    {t("banks.radius")}
                  </label>
                  <Select value={filters.radius_km} onValueChange={(v) => setFilters((prev) => ({ ...prev, radius_km: v }))}>
                    <SelectTrigger id="bank-radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_RADIUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option} {t("matching.km")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" variant="outline">
                  <Search className="size-4" aria-hidden />
                  {t("banks.applyNearby")}
                </Button>
                {hasNearby ? (
                  <Button type="button" variant="ghost" onClick={resetNearby}>
                    {t("banks.resetNearby")}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Alert className="mb-6">
        <Info className="size-4" aria-hidden />
        <AlertTitle>{t("banks.verification")}</AlertTitle>
        <AlertDescription>{t("banks.stockNote")}</AlertDescription>
      </Alert>

      {error ? <LoadError message={error} onRetry={() => applyFilters({ ...applied })} /> : null}
      {!error && pending && banks === null ? <CenteredLoader /> : null}
      {!error && !pending && banks !== null && banks.length === 0 ? (
        <EmptyState icon={SearchX} title={t("banks.empty")} body={t("banks.emptyBody")} />
      ) : null}
      {!error && banks !== null && banks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {banks.map((bank) => (
            <Card key={bank.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" aria-hidden />
                    {bank.name}
                  </span>
                  <VerificationBadge status={bank.verification_status} />
                </CardTitle>
                <CardDescription>
                  {bank.district.name}
                  {bank.locality ? ` · ${bank.locality}` : ""}
                  {hasNearby ? ` · ${t("banks.sortedByDistance")}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {bank.address ? <p className="text-muted-foreground">{bank.address}</p> : null}
                {bank.public_phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" aria-hidden />
                    <a href={`tel:${bank.public_phone}`} className="underline-offset-4 hover:underline">
                      {bank.public_phone}
                    </a>
                  </p>
                ) : null}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {t("banks.lastUpdated")}: {formatDate(bank.last_updated_at)}
                  </span>
                  <Link
                    to={`/blood-banks/${bank.id}`}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t("requests.viewDetails")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </PageShell>
  )
}
