import { api } from "@/lib/api-client"

export function listDistricts() {
  return api.get("/api/v1/locations/districts").then((response) => response.data)
}

export function listLocalBodies(districtId) {
  const params = districtId ? { district_id: districtId } : {}
  return api.get("/api/v1/locations/local-bodies", { params }).then((response) => response.data)
}
