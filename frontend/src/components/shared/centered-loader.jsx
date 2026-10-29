import { LoaderCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

export function CenteredLoader({ label }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin" aria-hidden />
      <p className="text-sm">{label || t("common.loading")}</p>
    </div>
  )
}
