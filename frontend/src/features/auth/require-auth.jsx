import { Navigate, useLocation } from "react-router"

import { useAuth } from "@/features/auth/auth-context"
import { CenteredLoader } from "@/components/shared/centered-loader"

/**
 * Guards routes that require a signed-in user. Waits for the bootstrap
 * /auth/me check before deciding, so a page reload doesn't flash the
 * login screen for already-authenticated users.
 */
export function RequireAuth({ children }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === "checking") {
    return <CenteredLoader />
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
