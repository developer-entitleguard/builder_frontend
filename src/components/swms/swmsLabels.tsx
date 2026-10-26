import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskBand, SwmsRegisterStatus } from "@/store/api/builderSwms";

/** SW13 register / document status chip. */
const STATUS: Record<string, { label: string; className: string }> = {
  NOT_SUPPLIED: { label: "Not supplied", className: "bg-slate-100 text-slate-700 border-slate-200" },
  REQUESTED: { label: "Requested", className: "bg-sky-100 text-sky-800 border-sky-200" },
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" },
  ISSUED: { label: "Issued", className: "bg-blue-100 text-blue-800 border-blue-200" },
  CHANGES_REQUESTED: { label: "Changes requested", className: "bg-amber-100 text-amber-800 border-amber-200" },
  ACCEPTED: { label: "Accepted", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  UNDER_REVIEW: { label: "Under review", className: "bg-orange-100 text-orange-800 border-orange-200" },
  CLOSED: { label: "Closed", className: "bg-zinc-200 text-zinc-700 border-zinc-300" },
};

export function SwmsStatusChip({ status, className }: { status: SwmsRegisterStatus | string; className?: string }) {
  const s = STATUS[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", s.className, className)}>
      {s.label}
    </Badge>
  );
}

const BAND: Record<RiskBand, string> = {
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  EXTREME: "bg-red-100 text-red-800 border-red-200",
};

export function RiskBandChip({ band, score }: { band?: RiskBand; score?: number }) {
  if (!band) return null;
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap text-[11px]", BAND[band])}>
      {band.charAt(0) + band.slice(1).toLowerCase()}
      {score != null ? ` · ${score}` : ""}
    </Badge>
  );
}
