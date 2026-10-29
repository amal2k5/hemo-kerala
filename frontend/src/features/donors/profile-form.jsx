import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { AVAILABILITY_STATUSES, BLOOD_GROUPS } from "@/components/shared/constants"
import { FieldShell, TextField } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LocationPicker } from "@/features/locations/location-picker"
import { listDistricts, listLocalBodies } from "@/features/locations/location-service"

/**
 * Shared form for creating and editing the donor profile. All values stay in
 * the parent's state; API failures only surface messages, never clear input.
 *
 * In edit mode, cleared optional fields are sent explicitly so the backend's
 * exclude_unset PATCH clears them.
 */
export function DonorProfileForm({
  initial,
  pending,
  fieldErrors,
  onSubmit,
  submitLabel,
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    blood_group: initial?.blood_group || "",
    availability_status: initial?.availability_status || "available",
    district_id: initial?.district?.id ? String(initial.district.id) : "",
    local_body_id: initial?.local_body?.id ? String(initial.local_body.id) : "",
    locality: initial?.locality || "",
    location:
      initial?.latitude != null && initial?.longitude != null
        ? { latitude: initial.latitude, longitude: initial.longitude, label: null }
        : null,
  })
  const [districts, setDistricts] = useState([])
  const [localBodies, setLocalBodies] = useState([])
  // Derived: a fetch for the selected district is in flight until the loaded
  // snapshot matches it. Avoids synchronous setState inside the effect.
  const [localBodiesLoadedFor, setLocalBodiesLoadedFor] = useState(null)
  const localBodiesPending = Boolean(values.district_id) && localBodiesLoadedFor !== values.district_id
  const [localErrors, setLocalErrors] = useState({})

  useEffect(() => {
    let cancelled = false
    listDistricts()
      .then((data) => {
        if (!cancelled) setDistricts(data)
      })
      .catch(() => {
        if (!cancelled) {
          setLocalErrors((prev) => ({ ...prev, district_id: t("requests.loadFailed") }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    if (!values.district_id) return undefined
    let cancelled = false
    listLocalBodies(values.district_id)
      .then((data) => {
        if (!cancelled) {
          setLocalBodies(data)
          setLocalBodiesLoadedFor(values.district_id)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocalBodies([])
          setLocalBodiesLoadedFor(values.district_id)
        }
      })
    return () => {
      cancelled = true
    }
  }, [values.district_id])

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleDistrictChange(value) {
    // The local-body list depends on the district; clear the body selection
    // when the district changes.
    setValues((prev) => ({
      ...prev,
      district_id: value,
      local_body_id: "",
    }))
  }

  function validate() {
    const next = {}
    if (!values.blood_group) next.blood_group = t("validation.bloodGroupRequired")
    return next
  }

  function handleSubmit(event) {
    event.preventDefault()
    const next = validate()
    setLocalErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit({
      blood_group: values.blood_group,
      availability_status: values.availability_status,
      district_id: values.district_id ? Number(values.district_id) : null,
      local_body_id: values.local_body_id ? Number(values.local_body_id) : null,
      locality: values.locality,
      latitude: values.location ? values.location.latitude : null,
      longitude: values.location ? values.location.longitude : null,
    })
  }

  const errors = { ...localErrors, ...fieldErrors }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label={t("donors.bloodGroup")} htmlFor="donor-blood-group" error={errors.blood_group}>
          <Select value={values.blood_group} onValueChange={(v) => setField("blood_group", v)}>
            <SelectTrigger id="donor-blood-group" aria-invalid={Boolean(errors.blood_group) || undefined}>
              <SelectValue placeholder={t("locations.selectBloodGroup")} />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>

        <FieldShell label={t("donors.availability")} htmlFor="donor-availability" error={errors.availability_status}>
          <Select value={values.availability_status} onValueChange={(v) => setField("availability_status", v)}>
            <SelectTrigger id="donor-availability">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label={t("donors.district")} htmlFor="donor-district" error={errors.district_id}>
          <Select value={values.district_id} onValueChange={handleDistrictChange}>
            <SelectTrigger id="donor-district" aria-invalid={Boolean(errors.district_id) || undefined}>
              <SelectValue placeholder={t("locations.districtPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {districts.map((district) => (
                <SelectItem key={district.id} value={String(district.id)}>
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>

        <FieldShell label={t("donors.localBody")} htmlFor="donor-local-body" error={errors.local_body_id}>
          <Select
            value={values.local_body_id || undefined}
            onValueChange={(v) => setField("local_body_id", v === "__none__" ? "" : v)}
            disabled={!values.district_id || localBodiesPending}
          >
            <SelectTrigger id="donor-local-body">
              <SelectValue placeholder={t("locations.localBodyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("donors.clearLocation")}</SelectItem>
              {localBodies.map((body) => (
                <SelectItem key={body.id} value={String(body.id)}>
                  {body.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      </div>

      <TextField
        label={t("donors.locality")}
        name="locality"
        hint={t("donors.localityHint")}
        value={values.locality}
        error={errors.locality}
        onChange={(event) => setField("locality", event.target.value)}
      />

      <LocationPicker
        value={values.location}
        onChange={(v) => setField("location", v)}
        disabled={pending}
      />

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("donors.saving") : submitLabel}
      </Button>
    </form>
  )
}
