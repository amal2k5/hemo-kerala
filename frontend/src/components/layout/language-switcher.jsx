import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { persistLanguage, SUPPORTED_LANGUAGES } from "@/i18n"

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  function changeLanguage(code) {
    i18n.changeLanguage(code)
    persistLanguage(code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("nav.language")}>
          <Languages className="size-4" aria-hidden />
          <span className="hidden sm:inline">{SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label || "English"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            aria-current={i18n.language === lang.code || undefined}
            className={i18n.language === lang.code ? "bg-accent" : undefined}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
