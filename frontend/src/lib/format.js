import i18n from "@/i18n"

export function formatDateTime(isoString) {
  if (!isoString) return ""
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(i18n.language === "ml" ? "ml-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatDate(isoString) {
  if (!isoString) return ""
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(i18n.language === "ml" ? "ml-IN" : "en-IN", {
    dateStyle: "medium",
  })
}

export function formatDistance(km) {
  if (km === null || km === undefined) return ""
  return `${km} km`
}

/** True when the request deadline (ISO string) is in the past. */
export function isPastDeadline(isoString) {
  if (!isoString) return false
  return new Date(isoString).getTime() <= Date.now()
}
