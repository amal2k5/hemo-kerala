/** Presentation-layer enum values. These mirror the backend's StrEnum values
 * exactly — translation happens at render time, never by changing values. */

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export const BLOOD_COMPONENTS = [
  { value: "whole_blood", labelKey: "components.whole_blood" },
  { value: "packed_red_cells", labelKey: "components.packed_red_cells" },
  { value: "platelets", labelKey: "components.platelets" },
  { value: "plasma", labelKey: "components.plasma" },
  { value: "cryoprecipitate", labelKey: "components.cryoprecipitate" },
]

export const REQUEST_STATUSES = [
  "open",
  "responses_received",
  "coordination_in_progress",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
  "expired",
  "closed_unfulfilled",
]

/** Statuses in which a request still accepts donor responses and matching. */
export const ACTIVE_REQUEST_STATUSES = ["open", "responses_received", "coordination_in_progress"]

export const RESPONSE_STATUSES = ["pending", "accepted", "declined", "withdrawn"]

/** Mirrors RESPONSE_STATUS_TRANSITIONS on the backend. */
export const RESPONSE_STATUS_TRANSITIONS = {
  pending: ["accepted", "declined", "withdrawn"],
  accepted: ["withdrawn"],
  declined: [],
  withdrawn: [],
}

export const AVAILABILITY_STATUSES = ["available", "paused", "withdrawn"]

export const FULFILMENT_OUTCOMES = [
  { value: "fulfilled", labelKey: "requests.outcomes.fulfilled" },
  { value: "partially_fulfilled", labelKey: "requests.outcomes.partially_fulfilled" },
  { value: "closed_unfulfilled", labelKey: "requests.outcomes.closed_unfulfilled" },
]

export const VERIFICATION_STATUSES = ["verified", "unverified", "stale", "unknown"]
