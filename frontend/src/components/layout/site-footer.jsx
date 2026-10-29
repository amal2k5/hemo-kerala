import { useTranslation } from "react-i18next"

export function SiteFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="font-medium text-foreground">HemoKerala</p>
          <p className="mt-1">{t("footer.about")}</p>
        </div>
        <p>{t("footer.matchingNote")}</p>
        <p>{t("footer.dataNote")}</p>
      </div>
    </footer>
  )
}
