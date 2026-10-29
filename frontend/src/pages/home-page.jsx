import { ClipboardList, Droplet, HandHeart, Info, MapPinned, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const STEPS = [
  { icon: ClipboardList, titleKey: "home.step1Title", bodyKey: "home.step1Body" },
  { icon: HandHeart, titleKey: "home.step2Title", bodyKey: "home.step2Body" },
  { icon: MapPinned, titleKey: "home.step3Title", bodyKey: "home.step3Body" },
]

export function HomePage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <section className="flex flex-col items-start gap-6 py-8 lg:py-14">
        <span className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
          <Droplet className="size-4 text-primary" aria-hidden />
          {t("app.tagline")}
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("home.heroSubtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/requests">{t("home.browseRequests")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/blood-banks">{t("home.findBloodBanks")}</Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link to="/donors/profile">{t("home.becomeDonor")}</Link>
          </Button>
        </div>
      </section>

      <section className="py-8">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("home.howItWorks")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.titleKey}>
              <CardHeader>
                <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="size-5 text-primary" aria-hidden />
                </span>
                <CardTitle className="text-base">
                  {index + 1}. {t(step.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t(step.bodyKey)}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-2">
        <Alert>
          <ShieldCheck className="size-4" aria-hidden />
          <AlertDescription>{t("home.honestyNote")}</AlertDescription>
        </Alert>
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>{t("home.eligibilityNote")}</AlertDescription>
        </Alert>
      </section>
    </div>
  )
}
