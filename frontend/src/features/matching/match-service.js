import { api } from "@/lib/api-client"

/** Radius options offered in the UI (backend allows up to 50 km). */
export const RADIUS_OPTIONS = [1, 2, 5, 10, 20, 50]

export function findNearbyDonors(requestId, { radiusKm = 10, limit = 50, offset = 0 } = {}) {
  return api
    .get(`/api/v1/requests/${requestId}/matches`, {
      params: { radius_km: radiusKm, limit, offset },
    })
    .then((response) => response.data)
}
