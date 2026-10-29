import axios from "axios"

const TOKEN_STORAGE_KEY = "hemokerala.access_token"
export const AUTH_EXPIRED_EVENT = "hemokerala:auth-expired"

const baseURL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "")

export const api = axios.create({
  baseURL,
  timeout: 20000,
})

export function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // Storage unavailable (private mode); the session simply won't survive a reload.
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 on a request that carried our token means the JWT is expired or
    // invalid. Credential failures (login/register) carry no token and are
    // surfaced to the caller instead of logging the user out.
    if (
      error.response?.status === 401 &&
      error.config?.headers?.Authorization &&
      !error.config._authExpiryHandled
    ) {
      error.config._authExpiryHandled = true
      storeToken(null)
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(normalizeApiError(error))
  },
)

/**
 * Normalized API failure. FastAPI returns either `{"detail": "string"}` for
 * domain errors or `{"detail": [{loc, msg, type}]}` for request validation;
 * both are flattened here so forms can show field-level messages.
 */
export class ApiError extends Error {
  constructor({ status, detail, fields }) {
    super(detail || "Request failed")
    this.name = "ApiError"
    this.status = status
    this.detail = detail || "Request failed"
    this.fields = fields || {}
  }
}

function normalizeApiError(error) {
  if (error.response) {
    const { status, data } = error.response
    let detail = null
    const fields = {}
    const payload = data?.detail
    if (typeof payload === "string") {
      detail = payload
    } else if (Array.isArray(payload)) {
      for (const item of payload) {
        const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : ""
        if (field && !fields[field]) {
          fields[field] = item.msg
        }
        if (!detail) {
          detail = item.msg
        }
      }
    }
    return new ApiError({ status, detail: detail || data?.detail || error.message, fields })
  }
  if (error.request) {
    return new ApiError({ status: null, detail: "Cannot reach the HemoKerala server. Check your connection and try again." })
  }
  return new ApiError({ status: null, detail: error.message })
}

export function isApiError(error) {
  return error instanceof ApiError
}
