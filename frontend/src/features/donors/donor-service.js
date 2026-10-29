import { api } from "@/lib/api-client"

const LOCATION_FIELDS = ["district_id", "local_body_id", "locality", "latitude", "longitude"]

/**
 * Build a PATCH payload honouring the backend's exclude_unset semantics:
 * keys that are absent are left untouched; keys explicitly present with null
 * clear the field.
 */
export function buildProfilePayload(values, currentProfile = null) {
  const payload = {}
  if (values.blood_group !== undefined && values.blood_group !== "") {
    payload.blood_group = values.blood_group
  }
  if (values.availability_status !== undefined && values.availability_status !== "") {
    payload.availability_status = values.availability_status
  }

  for (const field of LOCATION_FIELDS) {
    const value = values[field]
    if (value === undefined) continue
    const cleared = value === null || value === ""
    if (cleared) {
      // Only send an explicit clear when the field currently has a value.
      if (currentProfile && currentProfile[field] !== null && currentProfile[field] !== undefined) {
        payload[field] = null
      }
    } else {
      payload[field] = field === "latitude" || field === "longitude" ? Number(value) : value
    }
  }
  return payload
}

export function createDonorProfile(values) {
  return api
    .post("/api/v1/donors/profile", buildProfilePayload({ ...values, availability_status: values.availability_status ?? "available" }))
    .then((response) => response.data)
}

export function fetchDonorProfile() {
  return api.get("/api/v1/donors/profile").then((response) => response.data)
}

export function updateDonorProfile(values, currentProfile) {
  return api
    .patch("/api/v1/donors/profile", buildProfilePayload(values, currentProfile))
    .then((response) => response.data)
}

export function updateAvailability(availabilityStatus) {
  return api
    .patch("/api/v1/donors/profile/availability", { availability_status: availabilityStatus })
    .then((response) => response.data)
}
