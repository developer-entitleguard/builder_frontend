/** Display helpers for the builder SWMS screens (Templates/SWMS PRD SW10, SW13). */

/** NSW HRCW categories (backend template/swms/hrcw_categories.json). */
const HRCW_LABELS: Record<string, string> = {
  FALL_2M: "Risk of a person falling more than 2 m",
  TELCO_TOWER: "Work on a telecommunication tower",
  DEMO_LOAD_BEARING: "Demolition of a load bearing element",
  ASBESTOS: "Likely to disturb asbestos",
  STRUCT_TEMP_SUPPORT: "Structural alterations needing temporary support",
  CONFINED_SPACE: "Work in or near a confined space",
  TRENCH_1_5M: "Shaft or trench deeper than 1.5 m, or a tunnel",
  EXPLOSIVES: "Use of explosives",
  GAS_MAINS: "On or near pressurised gas mains or piping",
  CHEM_FUEL_LINES: "On or near chemical, fuel or refrigerant lines",
  ENERGISED_ELEC: "On or near energised electrical installations or services",
  CONTAM_ATMOS: "Area that may have a contaminated or flammable atmosphere",
  TILT_UP: "Tilt up or precast concrete",
  TRAFFIC_CORRIDOR: "On or next to a road, railway or other traffic corridor in use",
  MOBILE_PLANT: "Area with movement of powered mobile plant",
  TEMP_EXTREMES: "Areas with artificial extremes of temperature",
  DROWNING: "In or near water with a risk of drowning",
  DIVING: "Diving work",
};

export const humanize = (code: string): string =>
  code
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());

export const hrcwLabel = (code: string): string => HRCW_LABELS[code] ?? humanize(code);

export const CONTROL_LEVEL: Record<string, string> = {
  ELIMINATE: "Eliminate",
  SUBSTITUTE: "Substitute",
  ISOLATE: "Isolate",
  ENGINEERING: "Engineering",
  ADMINISTRATIVE: "Administrative",
  PPE: "PPE",
};

export const EVENT_LABEL: Record<string, string> = {
  CREATED: "Created",
  ISSUED: "Issued",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  CHANGE_REQUESTED: "Changes requested",
  REVISED: "Revised",
  STOP_WORK: "Work stopped",
  SIGNED_ON: "Worker signed on",
  CLOSED: "Closed",
  INCIDENT: "Notifiable incident recorded",
};

export const SIGNATURE_ROLE: Record<string, string> = {
  PREPARER: "Prepared by",
  AUTHORISER: "Authorised by",
  BUILDER: "Builder",
  WORKER: "Worker",
};

/** Server LocalDate/LocalDateTime strings → local display. */
export const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};
