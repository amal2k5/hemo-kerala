import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20">
      <EmptyState
        title="404"
        body={t("requests.detailNotFound")}
        action={
          <Button variant="outline" asChild>
            <Link to="/">{t("nav.home")}</Link>
          </Button>
        }
      />
    </div>
  )
}
