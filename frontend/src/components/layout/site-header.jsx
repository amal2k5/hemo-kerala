import { useState } from "react"
import { Droplet, Menu, UserRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, NavLink, useNavigate } from "react-router"

import { useAuth } from "@/features/auth/auth-context"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.home", end: true },
  { to: "/requests", labelKey: "nav.requests" },
  { to: "/blood-banks", labelKey: "nav.bloodBanks" },
]

export function SiteHeader() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    setMobileOpen(false)
    logout()
    navigate("/login")
  }

  const navLinkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-1">
          <Link to="/" className="mr-2 flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Droplet className="size-5 text-primary" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">HemoKerala</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {t(item.labelKey)}
              </NavLink>
            ))}
            {user ? (
              <NavLink to="/donors/profile" className={navLinkClass}>
                {t("nav.donorProfile")}
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" aria-label={t("nav.userMenu")}>
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {user.full_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[10rem] truncate sm:inline">{user.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/donors/profile")}>
                  <UserRound className="size-4" aria-hidden />
                  {t("nav.donorProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">{t("nav.register")}</Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("nav.openMenu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t px-4 py-2 md:hidden" aria-label="Mobile">
          <div className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass} onClick={() => setMobileOpen(false)}>
                {t(item.labelKey)}
              </NavLink>
            ))}
            {user ? (
              <NavLink to="/donors/profile" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                {t("nav.donorProfile")}
              </NavLink>
            ) : (
              <div className="flex gap-2 py-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    {t("nav.login")}
                  </Link>
                </Button>
                <Button size="sm" asChild className="flex-1">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    {t("nav.register")}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
