import { useEffect, useState } from "react"
import { Info, SearchX, UsersRound } from "lucide-react"
import { useTranslation } from "react-i18next"

import { findNearbyDonors, RADIUS_OPTIONS } from "@/features/matching/match-service"
import { AvailabilityBadge } from "@/components/shared/status-badge"
import { BloodGroupBadge } from "@/components/shared/blood-group-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadError } from "@/components/shared/load-error"
import { CenteredLoader } from "@/components/shared/centered-loader"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Owner-only panel for the /requests/{id}/matches endpoint. Results carry no
 * identity fields by design; the UI renders exactly what the API returns.
 */
export function MatchesPanel({ requestId }) {
  const { t } = useTranslation()
  const [radiusKm, setRadiusKm] = useState("10")
  const [appliedRadius, setAppliedRadius] = useState(10)
  const [attempt, setAttempt] = useState(0)
  const [results, setResults] = useState(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(null)

  // State changes happen in fetch callbacks only; the button handler sets
  // pending before bumping the applied radius to trigger the effect.
  useEffect(() => {
    let cancelled = false
    findNearbyDonors(requestId, { radiusKm: appliedRadius })
      .then((data) => {
        if (!cancelled) {
          setResults(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e)
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [requestId, appliedRadius, attempt])

  function search() {
    setPending(true)
    setAppliedRadius(Number(radiusKm))
    setAttempt((n) => n + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="size-5 text-primary" aria-hidden />
          {t("matching.title")}
        </CardTitle>
        <CardDescription>{t("matching.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label htmlFor="match-radius" className="mb-1.5 block text-sm font-medium">
              {t("matching.radius")}
            </label>
            <Select value={radiusKm} onValueChange={setRadiusKm}>
              <SelectTrigger id="match-radius">
                <SelectValue placeholder={t("locations.selectRadius")} />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} {t("matching.km")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={search} disabled={pending}>
            {pending ? t("matching.searching") : t("matching.search")}
          </Button>
        </div>

        {error ? (
          error.status === 422 ? (
            <Alert>
              <Info className="size-4" aria-hidden />
              <AlertDescription>{t("matching.noCoordinates")}</AlertDescription>
            </Alert>
          ) : (
            <LoadError message={error.detail || t("matching.loadFailed")} onRetry={search} />
          )
        ) : null}

        {!error && pending ? <CenteredLoader /> : null}

        {!error && !pending && results !== null && results.length === 0 ? (
          <EmptyState icon={SearchX} title={t("matching.empty")} body={t("matching.emptyBody", { radius: appliedRadius })} />
        ) : null}

        {!error && !pending && results !== null && results.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("matching.distance")}</TableHead>
                  <TableHead>{t("requests.bloodGroup")}</TableHead>
                  <TableHead>{t("matching.area")}</TableHead>
                  <TableHead>{t("donors.availability")}</TableHead>
                  <TableHead>{t("banks.verification")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((candidate) => (
                  <TableRow key={candidate.donor_profile_id}>
                    <TableCell className="font-medium">{candidate.distance_km} {t("matching.km")}</TableCell>
                    <TableCell>
                      <BloodGroupBadge group={candidate.blood_group} />
                    </TableCell>
                    <TableCell>
                      {candidate.district?.name}
                      {candidate.locality ? ` · ${candidate.locality}` : ""}
                    </TableCell>
                    <TableCell>
                      <AvailabilityBadge status={candidate.availability_status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {candidate.contact_verified ? t("matching.contactVerified") : t("matching.contactUnverified")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>{t("matching.privacyNote")}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
