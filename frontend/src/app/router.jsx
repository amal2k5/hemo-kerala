import { Route, Routes } from "react-router"

import { RequireAuth } from "@/features/auth/require-auth"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { HomePage } from "@/pages/home-page"
import { LoginPage } from "@/pages/login-page"
import { RegisterPage } from "@/pages/register-page"
import { RequestsListPage } from "@/pages/requests-list-page"
import { RequestCreatePage } from "@/pages/request-create-page"
import { RequestDetailPage } from "@/pages/request-detail-page"
import { DonorProfilePage } from "@/pages/donor-profile-page"
import { BloodBanksListPage } from "@/pages/blood-banks-list-page"
import { BloodBankDetailPage } from "@/pages/blood-bank-detail-page"
import { NotFoundPage } from "@/pages/not-found-page"

export function AppRouter() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/blood-banks" element={<BloodBanksListPage />} />
          <Route path="/blood-banks/:bankId" element={<BloodBankDetailPage />} />
          <Route
            path="/requests"
            element={
              <RequireAuth>
                <RequestsListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/requests/new"
            element={
              <RequireAuth>
                <RequestCreatePage />
              </RequireAuth>
            }
          />
          <Route
            path="/requests/:requestId"
            element={
              <RequireAuth>
                <RequestDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/donors/profile"
            element={
              <RequireAuth>
                <DonorProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  )
}
