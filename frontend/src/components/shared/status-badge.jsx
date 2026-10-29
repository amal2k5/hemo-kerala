import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

const REQUEST_STATUS_VARIANTS = {
  open: "secondary",
  responses_received: "info",
  coordination_in_progress: "info",
  partially_fulfilled: "warning",
  fulfilled: "success",
  cancelled: "outline",
  expired: "outline",
  closed_unfulfilled: "outline",
}

const RESPONSE_STATUS_VARIANTS = {
  pending: "warning",
  accepted: "success",
  declined: "outline",
  withdrawn: "outline",
}

const AVAILABILITY_VARIANTS = {
  available: "success",
  paused: "warning",
  withdrawn: "outline",
}

const VERIFICATION_VARIANTS = {
  verified: "success",
  unverified: "warning",
  stale: "warning",
  unknown: "outline",
}

/**
 * Badge variants are defined once here instead of via an expanded Badge API,
 * keeping the shadcn badge untouched.
 */
const VARIANT_CLASSES = {
  info: "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  success: "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  warning: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
}

function variantClass(variant) {
  return VARIANT_CLASSES[variant] || undefined
}

export function RequestStatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <Badge variant={REQUEST_STATUS_VARIANTS[status] || "secondary"} className={variantClass(REQUEST_STATUS_VARIANTS[status])}>
      {t(`requestStatuses.${status}`)}
    </Badge>
  )
}

export function ResponseStatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <Badge variant={RESPONSE_STATUS_VARIANTS[status] || "secondary"} className={variantClass(RESPONSE_STATUS_VARIANTS[status])}>
      {t(`responseStatuses.${status}`)}
    </Badge>
  )
}

export function AvailabilityBadge({ status }) {
  const { t } = useTranslation()
  return (
    <Badge variant={AVAILABILITY_VARIANTS[status] || "secondary"} className={variantClass(AVAILABILITY_VARIANTS[status])}>
      {t(`availabilityStatuses.${status}`)}
    </Badge>
  )
}

export function VerificationBadge({ status }) {
  const { t } = useTranslation()
  return (
    <Badge variant={VERIFICATION_VARIANTS[status] || "outline"} className={variantClass(VERIFICATION_VARIANTS[status])}>
      {t(`banks.verificationLevels.${status}`)}
    </Badge>
  )
}
