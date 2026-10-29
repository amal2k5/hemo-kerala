import { api } from "@/lib/api-client"

export function submitResponse(requestId) {
  return api.post(`/api/v1/requests/${requestId}/responses`).then((response) => response.data)
}

export function listResponses(requestId) {
  return api.get(`/api/v1/requests/${requestId}/responses`).then((response) => response.data)
}

export function updateResponseStatus(requestId, responseId, status) {
  return api
    .patch(`/api/v1/requests/${requestId}/responses/${responseId}`, { status })
    .then((response) => response.data)
}
