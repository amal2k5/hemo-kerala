import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AuthContext } from "@/features/auth/auth-context"
import { fetchCurrentUser, loginUser, registerUser } from "@/features/auth/auth-service"
import { AUTH_EXPIRED_EVENT, getStoredToken, storeToken } from "@/lib/api-client"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // "checking" until the bootstrap /auth/me call resolves, so protected
  // routes don't bounce a returning user to /login on page reload. The
  // initial value is derived synchronously from stored-token presence.
  const [status, setStatus] = useState(() => (getStoredToken() ? "checking" : "anonymous"))
  const tokenRef = useRef(getStoredToken())

  useEffect(() => {
    if (!tokenRef.current) return undefined
    let cancelled = false
    fetchCurrentUser()
      .then((me) => {
        if (!cancelled) {
          setUser(me)
          setStatus("authenticated")
        }
      })
      .catch(() => {
        if (!cancelled) {
          storeToken(null)
          tokenRef.current = null
          setStatus("anonymous")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleAuthExpired() {
      tokenRef.current = null
      setUser(null)
      setStatus("anonymous")
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  const login = useCallback(async (credentials) => {
    const token = await loginUser(credentials)
    storeToken(token.access_token)
    tokenRef.current = token.access_token
    const me = await fetchCurrentUser()
    setUser(me)
    setStatus("authenticated")
    return me
  }, [])

  const register = useCallback(async (details) => {
    const created = await registerUser(details)
    return created
  }, [])

  const logout = useCallback(() => {
    storeToken(null)
    tokenRef.current = null
    setUser(null)
    setStatus("anonymous")
  }, [])

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
