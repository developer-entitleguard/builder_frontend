import { FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtRecoveryDate, STATEMENT_FALLBACK, type EvidenceRecord } from "@/store/api/recovery";

/**
 * The record of events a recovery case relies on (RecoveryEvidence.Record).
 * Used on the builder's case page, the Notices received screen and the public
 * response page. Entitle Guard records; it never judges: every view ends with
 * the record's statement.
 */
const EvidenceView = ({
  record,
  ownRecordTitle,
  fileHref,
}: {
  record: EvidenceRecord;
  /** "Their own record on this home" (builder) or "Your own record on this home" (recipient). */
  ownRecordTitle: string;
  /** Link for a photo or timeline file; null shows the name only (no-login page). */
  fileHref?: (fileId: string) => string | null;
}) => {
  const link = (fileId: string | null | undefined, label: string) => {
    const href = fileId && fileHref ? fileHref(fileId) : null;
    if (!href) return <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" />{label}</span>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        <FileText className="h-4 w-4" />
        {label}
      </a>
    );
  };

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h3 className="font-medium mb-2">Facts</h3>
        {record.facts.length === 0 ? (
          <p className="text-muted-foreground">None recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fact</TableHead>
                  <TableHead>The record shows</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.facts.map((f, i) => (
                  <TableRow key={`${f.label}-${i}`}>
                    <TableCell className="align-top font-medium">{f.label}</TableCell>
                    <TableCell className="align-top whitespace-pre-wrap">{f.value || "Not recorded"}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{f.source || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">How the record links this work</h3>
        {record.basis.length === 0 ? (
          <p className="text-muted-foreground">No links from the record. The recipient was named by the builder.</p>
        ) : (
          <ul className="space-y-1">
            {record.basis.map((l) => (
              <li key={l.id}>
                {l.label}
                {l.on ? ` (${fmtRecoveryDate(l.on)})` : ""}
                {l.source && <span className="text-muted-foreground">, source: {l.source}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">{ownRecordTitle}</h3>
        {record.targetOwnRecord.length === 0 ? (
          <p className="text-muted-foreground">Nothing on the record.</p>
        ) : (
          <ul className="space-y-3">
            {record.targetOwnRecord.map((j) => (
              <li key={j.jobId} className="rounded-md border p-3">
                <div className="font-medium">{j.title || "Job"}</div>
                {j.scope && <p className="text-muted-foreground whitespace-pre-wrap">{j.scope}</p>}
                {j.completedOn && <p className="text-muted-foreground">Completed {fmtRecoveryDate(j.completedOn)}</p>}
                {j.documents.length > 0 && (
                  <ul className="mt-2 list-disc pl-5">
                    {j.documents.map((d, i) => (
                      <li key={i}>
                        {d.label}: {d.value}
                        {d.source && <span className="text-muted-foreground">, source: {d.source}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">Photos</h3>
        {record.photos.length === 0 ? (
          <p className="text-muted-foreground">None attached.</p>
        ) : (
          <ul className="space-y-1">
            {record.photos.map((p) => (
              <li key={p.fileId}>{link(p.fileId, p.name || "Photo")}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">Timeline</h3>
        {record.timeline.length === 0 ? (
          <p className="text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-1">
            {record.timeline.map((e, i) => (
              <li key={i}>
                <span className="tabular-nums text-muted-foreground">{fmtRecoveryDate(e.at)}</span> · {e.text}
                {e.source && <span className="text-muted-foreground"> ({e.source})</span>}
                {e.fileId && <span className="ml-2">{link(e.fileId, "File")}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="rounded-md border bg-muted/40 p-3 text-muted-foreground">{record.statement || STATEMENT_FALLBACK}</p>
    </div>
  );
};

export default EvidenceView;
