import { api } from "@/lib/api-client"

/**
 * List the public blood-bank directory. `latitude`/`longitude` must be passed
 * together; the backend rejects a radius without both.
 */
export function listBloodBanks({ districtId, verificationStatus, latitude, longitude, radiusKm, limit = 50, offset = 0 } = {}) {
  const params = { limit, offset }
  if (districtId) params.district_id = districtId
  if (verificationStatus) params.verification_status = verificationStatus
  const hasCoordinates = latitude !== "" && latitude != null && longitude !== "" && longitude != null
  if (hasCoordinates) {
    params.latitude = Number(latitude)
    params.longitude = Number(longitude)
    if (radiusKm) params.radius_km = Number(radiusKm)
  }
  return api.get("/api/v1/blood-banks", { params }).then((response) => response.data)
}

export function fetchBloodBank(bankId) {
  return api.get(`/api/v1/blood-banks/${bankId}`).then((response) => response.data)
}
