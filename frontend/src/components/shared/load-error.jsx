import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/** Alert shown when a page fails to load its data, with an optional retry. */
export function LoadError({ message, onRetry }) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{t("common.error")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
