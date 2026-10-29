import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { AuthCard } from "@/features/auth/auth-card"
import { useAuth } from "@/features/auth/auth-context"
import { ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/shared/field"

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: "", password: "" })
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)

  function validate() {
    const next = {}
    if (!values.email.trim()) next.email = t("validation.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = t("validation.emailInvalid")
    if (!values.password) next.password = t("validation.passwordRequired")
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setPending(true)
    try {
      await login({ email: values.email.trim(), password: values.password })
      toast.success(t("auth.welcome"))
      navigate(location.state?.from || "/requests", { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        toast.error(error.status === 401 ? t("auth.loginFailed") : error.detail)
      } else {
        toast.error(t("common.error"))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("auth.email")}
          type="email"
          name="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(event) => setValues((v) => ({ ...v, email: event.target.value }))}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
        />
        <Button type="submit" disabled={pending}>
          {pending ? t("auth.loggingIn") : t("auth.loginAction")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("nav.register")}
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
