import { Droplet } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Shared centered card layout for login and registration. */
export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mx-auto mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Droplet className="size-5 text-primary" aria-hidden />
          </span>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
