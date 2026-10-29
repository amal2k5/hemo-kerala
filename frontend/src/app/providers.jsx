import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Toaster } from "sonner"

import { AuthProvider } from "@/features/auth/auth-provider"
import { AUTH_EXPIRED_EVENT } from "@/lib/api-client"

/**
 * App-wide providers: authentication context, the toast viewport, and a
 * listener that routes users to login when their JWT expires mid-session.
 */
export function AppProviders({ children }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    function handleAuthExpired() {
      toast.info(t("auth.sessionExpired"))
      navigate("/login", { replace: true })
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [navigate, t])

  return (
    <AuthProvider>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  )
}
