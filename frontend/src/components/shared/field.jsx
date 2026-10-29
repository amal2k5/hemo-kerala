import { useId } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Labeled text input with API/validation error display. Form values live in
 * the parent's state so failures never clear what the user typed.
 */
export function TextField({ label, error, hint, optional, ...props }) {
  const generatedId = useId()
  const id = props.id || generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">({props.optionalLabel})</span> : null}
      </Label>
      <Input
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Label + error wrapper for arbitrary controls (selects, textareas). */
export function FieldShell({ label, htmlFor, error, hint, children }) {
  const hintId = `${htmlFor}-hint`
  const errorId = `${htmlFor}-error`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
