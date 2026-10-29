import { api } from "@/lib/api-client"

export function registerUser({ email, password, fullName, phoneNumber }) {
  return api
    .post("/api/v1/auth/register", {
      email,
      password,
      full_name: fullName,
      phone_number: phoneNumber || null,
    })
    .then((response) => response.data)
}

export function loginUser({ email, password }) {
  return api
    .post("/api/v1/auth/login", { email, password })
    .then((response) => response.data)
}

export function fetchCurrentUser() {
  return api.get("/api/v1/auth/me").then((response) => response.data)
}
