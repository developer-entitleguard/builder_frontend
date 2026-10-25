import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  FolderUploadEntry,
  GroupedFolderUploadResult,
} from "@/store/api/projectDocuments";

/** Which project shape the folder was uploaded to — decides the routing hint wording. */
export type FolderRoutingKind = "residential" | "commercial" | "mixed";

/** One-line hint shown next to a compliance folder-upload button. */
export const FolderRoutingHint = ({ kind }: { kind: FolderRoutingKind }) => {
  const code = (s: string) => <code className="rounded bg-muted px-1 text-[11px]">{s}</code>;
  return (
    <p className="text-xs text-muted-foreground">
      {kind === "residential" && (
        <>Use subfolders {code("Project")}, {code("Unit 1")}, {code("Unit 2")}… to file per unit.</>
      )}
      {kind === "commercial" && <>Every file in the folder is filed on the commercial checklist.</>}
      {kind === "mixed" && (
        <>
          Use subfolders {code("Commercial")} (or the top level), {code("Residential")} and{" "}
          {code("Residential/Unit 1")}… to file per level.
        </>
      )}
    </p>
  );
};

const describeEntries = (entries: FolderUploadEntry[]): string => {
  const counts = { matched: 0, added: 0, updated: 0 };
  entries.forEach((e) => {
    if (e.disposition) counts[e.disposition] += 1;
  });
  const parts = [
    counts.matched ? `${counts.matched} matched` : null,
    counts.added ? `${counts.added} added` : null,
    counts.updated ? `${counts.updated} new version${counts.updated === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return `${entries.length} file${entries.length === 1 ? "" : "s"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
};

const compareUnits = (a: string, b: string) => {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
};

/**
 * Grouped result of a compliance folder upload: how many files landed at each
 * level (project, each unit, commercial), plus files that couldn't be routed
 * (with the reason) and files that couldn't be stored.
 */
export const FolderUploadSummary = ({
  result,
  onDismiss,
}: {
  result: GroupedFolderUploadResult;
  onDismiss?: () => void;
}) => {
  const rows: Array<{ label: string; entries: FolderUploadEntry[] }> = [];
  if (result.commercial?.length) rows.push({ label: "Commercial checklist", entries: result.commercial });
  if (result.project?.length) rows.push({ label: "Project", entries: result.project });
  Object.keys(result.units ?? {})
    .sort(compareUnits)
    .forEach((unit) => {
      const entries = result.units?.[unit] ?? [];
      if (entries.length) rows.push({ label: `Unit ${unit}`, entries });
    });
  const unrouted = result.unrouted ?? [];
  const failed = result.failed ?? [];
  const hasProblems = unrouted.length > 0 || failed.length > 0;

  if (rows.length === 0 && !hasProblems) return null;

  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        hasProblems ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {hasProblems ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          Folder upload summary
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <ul className="mt-1.5 ml-6 space-y-0.5">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="font-medium">{r.label}:</span>{" "}
              <span className="text-muted-foreground">{describeEntries(r.entries)}</span>
            </li>
          ))}
        </ul>
      )}

      {unrouted.length > 0 && (
        <div className="mt-2">
          <div className="font-medium text-amber-800">
            {unrouted.length} file{unrouted.length === 1 ? "" : "s"} not filed:
          </div>
          <ul className="ml-6 list-disc text-muted-foreground">
            {unrouted.map((u, i) => (
              <li key={`${u.relativePath ?? u.fileName}-${i}`}>
                {u.relativePath || u.fileName} — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {failed.length > 0 && (
        <div className="mt-2">
          <div className="font-medium text-amber-800">
            {failed.length} file{failed.length === 1 ? "" : "s"} couldn&apos;t be stored — please retry:
          </div>
          <ul className="ml-6 list-disc text-muted-foreground">
            {failed.map((f, i) => (
              <li key={`${f}-${i}`}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
