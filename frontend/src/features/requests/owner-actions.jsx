import { useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { cancelRequest, confirmFulfilment } from "@/features/requests/request-service"
import { ApiError } from "@/lib/api-client"
import { ACTIVE_REQUEST_STATUSES, FULFILMENT_OUTCOMES } from "@/components/shared/constants"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Cancel and fulfilment confirmation for the request owner. The backend
 * remains the authority on transitions; errors surface verbatim.
 */
export function OwnerActions({ request, onUpdated }) {
  const { t } = useTranslation()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [fulfilmentOpen, setFulfilmentOpen] = useState(false)
  const [outcome, setOutcome] = useState("")
  const [pending, setPending] = useState(false)

  const isActive = ACTIVE_REQUEST_STATUSES.includes(request.status)
  if (!isActive) return null

  async function handleCancel() {
    setPending(true)
    try {
      const updated = await cancelRequest(request.id)
      toast.success(t("requests.cancelled"))
      setConfirmingCancel(false)
      onUpdated(updated)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.detail : t("common.error"))
      setConfirmingCancel(false)
    } finally {
      setPending(false)
    }
  }

  async function handleFulfilment(event) {
    event.preventDefault()
    if (!outcome) return
    setPending(true)
    try {
      const updated = await confirmFulfilment(request.id, outcome)
      toast.success(t("requests.fulfilmentRecorded"))
      setFulfilmentOpen(false)
      setOutcome("")
      onUpdated(updated)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.detail : t("common.error"))
      setFulfilmentOpen(false)
      setOutcome("")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("requests.ownerActions")}</CardTitle>
        <CardDescription>{t(`requests.statusHint.${request.status}`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setConfirmingCancel(true)} disabled={pending}>
          <XCircle className="size-4" aria-hidden />
          {t("requests.cancel")}
        </Button>
        <Button onClick={() => setFulfilmentOpen(true)} disabled={pending}>
          <CheckCircle2 className="size-4" aria-hidden />
          {t("requests.confirmFulfilment")}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title={t("requests.cancelConfirmTitle")}
        body={t("requests.cancelConfirmBody")}
        confirmLabel={t("requests.cancel")}
        pending={pending}
        onConfirm={handleCancel}
      />

      <Dialog open={fulfilmentOpen} onOpenChange={(open) => (open ? setFulfilmentOpen(true) : setFulfilmentOpen(false))}>
        <DialogContent>
          <form onSubmit={handleFulfilment}>
            <DialogHeader>
              <DialogTitle>{t("requests.fulfilmentTitle")}</DialogTitle>
              <DialogDescription>{t("requests.fulfilmentBody")}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="fulfilment-outcome" className="mb-1.5 block text-sm font-medium">
                {t("requests.outcome")}
              </label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger id="fulfilment-outcome">
                  <SelectValue placeholder={t("requests.outcome")} />
                </SelectTrigger>
                <SelectContent>
                  {FULFILMENT_OUTCOMES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFulfilmentOpen(false)} disabled={pending}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending || !outcome}>
                {pending ? t("common.loading") : t("requests.confirmFulfilment")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
