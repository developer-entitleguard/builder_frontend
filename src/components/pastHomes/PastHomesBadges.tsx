import { Badge } from "@/components/ui/badge";
import type { ClassPosition, PastHomeFile, PastHomeRowStatus } from "@/store/api/pastHomes";
import {
  FILE_STATUS_LABEL,
  POSITION_CLASS,
  POSITION_LABEL,
  ROW_STATUS_LABEL,
  fmtDate,
  humanise,
} from "./pastHomesCopy";

export const RowStatusBadge = ({ status }: { status: PastHomeRowStatus }) => {
  const label = ROW_STATUS_LABEL[status] ?? status;
  switch (status) {
    case "CONFIRMED":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{label}</Badge>;
    case "MERGED":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{label}</Badge>;
    case "ERROR":
      return <Badge variant="destructive">{label}</Badge>;
    case "SKIPPED":
      return <Badge variant="secondary">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
};

export const CoverChips = ({ positions }: { positions: ClassPosition[] | null | undefined }) => {
  if (!positions || positions.length === 0) {
    return <span className="text-xs text-muted-foreground">Unclear</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {positions.map((p, i) => {
        const label = POSITION_LABEL[p.position] ?? p.position;
        const detail = [
          p.periodEnds ? `Statutory period ends ${fmtDate(p.periodEnds)}` : null,
          p.outerLimitEnds ? `Outer limit ends ${fmtDate(p.outerLimitEnds)}` : null,
          p.citation,
        ]
          .filter(Boolean)
          .join(". ");
        return (
          <span
            key={`${p.defectClass}-${i}`}
            title={detail || undefined}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${POSITION_CLASS[p.position] ?? ""}`}
          >
            {humanise(p.defectClass)}: {label}
          </span>
        );
      })}
    </div>
  );
};

export const FileStatusBadge = ({ file }: { file: PastHomeFile }) => {
  const label = FILE_STATUS_LABEL[file.status] ?? file.status;
  if (file.status === "STORED") return <Badge variant="outline">{label}</Badge>;
  if (file.status === "PROPOSED")
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
};
