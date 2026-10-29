import { api } from "@/lib/api-client"

export function listActiveRequests({ limit = 50, offset = 0 } = {}) {
  return api
    .get("/api/v1/requests", { params: { limit, offset } })
    .then((response) => response.data)
}

export function fetchRequest(requestId) {
  return api.get(`/api/v1/requests/${requestId}`).then((response) => response.data)
}

export function createRequest({ bloodGroup, component, districtId, locality, latitude, longitude, requiredBy }) {
  const hasCoordinates = latitude !== "" && latitude != null && longitude !== "" && longitude != null
  return api
    .post("/api/v1/requests", {
      blood_group: bloodGroup,
      component,
      district_id: districtId,
      locality: locality || null,
      ...(hasCoordinates ? { latitude: Number(latitude), longitude: Number(longitude) } : {}),
      required_by: requiredBy,
    })
    .then((response) => response.data)
}

export function cancelRequest(requestId) {
  return api.post(`/api/v1/requests/${requestId}/cancel`).then((response) => response.data)
}

export function confirmFulfilment(requestId, outcome) {
  return api
    .post(`/api/v1/requests/${requestId}/confirm-fulfilment`, { outcome })
    .then((response) => response.data)
}
