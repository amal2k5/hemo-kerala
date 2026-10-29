import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { useAuth } from "@/features/auth/auth-context"
import { AuthCard } from "@/features/auth/auth-card"
import { ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/shared/field"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const { t } = useTranslation()
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ fullName: "", email: "", password: "", phoneNumber: "" })
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)

  function validate() {
    const next = {}
    if (!values.fullName.trim()) next.fullName = t("validation.fullNameRequired")
    if (!values.email.trim()) next.email = t("validation.emailRequired")
    else if (!EMAIL_PATTERN.test(values.email)) next.email = t("validation.emailInvalid")
    if (!values.password) next.password = t("validation.passwordRequired")
    else if (values.password.length < 8) next.password = t("validation.passwordMin")
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setPending(true)
    try {
      await register({
        email: values.email.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        phoneNumber: values.phoneNumber.trim(),
      })
      // Log straight in so the new user lands on an authenticated page.
      await login({ email: values.email.trim(), password: values.password })
      toast.success(t("auth.welcome"))
      navigate("/donors/profile", { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        toast.error(error.detail)
      } else {
        toast.error(t("common.error"))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard title={t("auth.registerTitle")} subtitle={t("auth.registerSubtitle")}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t("auth.fullName")}
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          error={errors.fullName}
          onChange={(event) => setValues((v) => ({ ...v, fullName: event.target.value }))}
        />
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
          autoComplete="new-password"
          hint={t("auth.passwordHint")}
          value={values.password}
          error={errors.password}
          onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
        />
        <TextField
          label={t("auth.phoneNumber")}
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          optional
          optionalLabel={t("auth.optional")}
          value={values.phoneNumber}
          error={errors.phoneNumber}
          onChange={(event) => setValues((v) => ({ ...v, phoneNumber: event.target.value }))}
        />
        <Button type="submit" disabled={pending}>
          {pending ? t("auth.registering") : t("auth.registerAction")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("nav.login")}
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
