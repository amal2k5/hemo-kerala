import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { createRequest } from "@/features/requests/request-service"
import { listDistricts } from "@/features/locations/location-service"
import { LocationPicker } from "@/features/locations/location-picker"
import { ApiError } from "@/lib/api-client"
import { PageShell } from "@/components/layout/page-shell"
import { FieldShell, TextField } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BLOOD_COMPONENTS, BLOOD_GROUPS } from "@/components/shared/constants"

/** Value for the datetime-local input: 30 minutes from now, minute precision. */
function defaultDeadline() {
  const date = new Date(Date.now() + 30 * 60 * 1000)
  date.setSeconds(0, 0)
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function RequestCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [values, setValues] = useState({
    blood_group: "",
    component: "",
    district_id: "",
    locality: "",
    location: null,
    required_by: defaultDeadline(),
  })
  const [districts, setDistricts] = useState([])
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    listDistricts()
      .then((data) => {
        if (!cancelled) setDistricts(data)
      })
      .catch(() => {
        if (!cancelled) setErrors((prev) => ({ ...prev, district_id: t("requests.loadFailed") }))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    const next = {}
    if (!values.blood_group) next.blood_group = t("validation.bloodGroupRequired")
    if (!values.component) next.component = t("validation.componentRequired")
    if (!values.district_id) next.district_id = t("validation.districtRequired")
    if (!values.required_by) {
      next.required_by = t("validation.deadlineRequired")
    } else if (new Date(values.required_by).getTime() <= Date.now()) {
      next.required_by = t("validation.deadlineFuture")
    }
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setPending(true)
    try {
      const created = await createRequest({
        bloodGroup: values.blood_group,
        component: values.component,
        districtId: Number(values.district_id),
        locality: values.locality.trim() || null,
        latitude: values.location ? values.location.latitude : null,
        longitude: values.location ? values.location.longitude : null,
        // Sent as ISO with the browser's offset; the backend stores it as UTC.
        requiredBy: new Date(values.required_by).toISOString(),
      })
      toast.success(t("requests.created"))
      navigate(`/requests/${created.id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        toast.error(error.detail)
      } else {
        toast.error(t("common.error"))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <PageShell title={t("requests.newTitle")} subtitle={t("requests.newSubtitle")}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("requests.newTitle")}</CardTitle>
          <CardDescription>{t("requests.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label={t("requests.bloodGroup")} htmlFor="request-blood-group" error={errors.blood_group}>
                <Select value={values.blood_group} onValueChange={(v) => setField("blood_group", v)}>
                  <SelectTrigger id="request-blood-group" aria-invalid={Boolean(errors.blood_group) || undefined}>
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

              <FieldShell label={t("requests.component")} htmlFor="request-component" error={errors.component}>
                <Select value={values.component} onValueChange={(v) => setField("component", v)}>
                  <SelectTrigger id="request-component" aria-invalid={Boolean(errors.component) || undefined}>
                    <SelectValue placeholder={t("locations.selectComponent")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_COMPONENTS.map((component) => (
                      <SelectItem key={component.value} value={component.value}>
                        {t(component.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label={t("requests.district")} htmlFor="request-district" error={errors.district_id}>
                <Select value={values.district_id} onValueChange={(v) => setField("district_id", v)}>
                  <SelectTrigger id="request-district" aria-invalid={Boolean(errors.district_id) || undefined}>
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

              <TextField
                label={t("requests.locality")}
                name="locality"
                value={values.locality}
                error={errors.locality}
                onChange={(event) => setField("locality", event.target.value)}
              />
            </div>

            <TextField
              label={t("requests.requiredBy")}
              name="required_by"
              type="datetime-local"
              value={values.required_by}
              error={errors.required_by}
              onChange={(event) => setField("required_by", event.target.value)}
            />

            <LocationPicker
              value={values.location}
              onChange={(v) => setField("location", v)}
              disabled={pending}
            />

            <Button type="submit" disabled={pending} className="self-start">
              {pending ? t("requests.creating") : t("requests.createAction")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  )
}
