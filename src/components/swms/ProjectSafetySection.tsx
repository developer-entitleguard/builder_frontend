import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ExternalLink, FileText, Loader2, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useGetSwmsRegisterQuery, type SwmsRegisterRow } from "@/store/api/builderSwms";
import { formatDate } from "@/lib/swmsFormat";
import { SwmsStatusChip } from "./swmsLabels";
import { RequestSwmsDialog, type RequestSwmsTradeOption } from "./RequestSwmsDialog";

/**
 * Templates/SWMS PRD SW13 (plan §7 Phase 5.2). Project → Safety tab: one row
 * per trade on the project with the status of its latest issued SWMS.
 */
export function ProjectSafetySection({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { hasPermission } = useEntitlements();
  const canRequest = hasPermission("SWMS_REVIEW");
  const { data, isLoading, isError, isFetching, refetch } = useGetSwmsRegisterQuery(projectId);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTrade, setRequestTrade] = useState<string | null>(null);

  const trades: RequestSwmsTradeOption[] = useMemo(
    () =>
      (data?.rows ?? [])
        .filter((r): r is SwmsRegisterRow & { tradeOrgId: string } => !!r.tradeOrgId)
        .map((r) => ({ tradeOrgId: r.tradeOrgId, tradeName: r.tradeName })),
    [data],
  );

  const openRequest = (tradeOrgId: string | null) => {
    setRequestTrade(tradeOrgId);
    setRequestOpen(true);
  };

  const openSwms = (id: string, tradeName?: string) =>
    navigate(
      `/swms/${id}?project=${encodeURIComponent(projectId)}${tradeName ? `&trade=${encodeURIComponent(tradeName)}` : ""}`,
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            SWMS register
          </CardTitle>
          <CardDescription>
            Safe Work Method Statements from the trades on this project. Review each one, accept it or ask for changes.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
          {canRequest && (
            <Button size="sm" onClick={() => openRequest(null)} disabled={isLoading || isError}>
              <Plus className="mr-1 h-4 w-4" />
              Request a SWMS
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError || !data ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Could not load the SWMS register.</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : data.rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No trades on this project yet. Trades appear here once they have a job on the project or you request a SWMS
            from them.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Latest SWMS</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Workers signed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row, i) => {
                  const latest = row.documents[0];
                  return (
                    <TableRow key={row.tradeOrgId ?? row.openRequest?.id ?? `row-${i}`}>
                      <TableCell className="font-medium">
                        {row.tradeName}
                        {!row.tradeOrgId && row.openRequest?.recipientEmail && (
                          <div className="text-xs font-normal text-muted-foreground">{row.openRequest.recipientEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <SwmsStatusChip status={row.status} />
                        {row.status === "REQUESTED" && row.openRequest?.createdAt && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(row.openRequest.createdAt)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm">
                        {row.jobTitles.length ? (
                          <span title={row.jobTitles.join(", ")} className="line-clamp-2">
                            {row.jobTitles.join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {latest ? (
                          <div>
                            <div className="font-medium">
                              {latest.number} · v{latest.issuedVersion ?? latest.version}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1" title={latest.title}>
                              {latest.title}
                            </div>
                            {row.documents.length > 1 && (
                              <div className="text-xs text-muted-foreground">
                                +{row.documents.length - 1} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{latest ? formatDate(latest.issuedAt) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{latest ? latest.workersSigned : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {latest && (
                            <Button size="sm" variant="outline" onClick={() => openSwms(latest.id, row.tradeName)}>
                              <FileText className="mr-1 h-4 w-4" />
                              Open
                            </Button>
                          )}
                          {row.documents.length > 1 && (
                            <OtherDocuments row={row} onOpen={(docId) => openSwms(docId, row.tradeName)} />
                          )}
                          {canRequest && row.tradeOrgId && !row.openRequest && (row.status === "NOT_SUPPLIED" || row.status === "CLOSED") && (
                            <Button size="sm" variant="ghost" onClick={() => openRequest(row.tradeOrgId)}>
                              Request a SWMS
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <RequestSwmsDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        projectId={projectId}
        trades={trades}
        initialTradeOrgId={requestTrade}
      />
    </Card>
  );
}

/** Older SWMS from the same trade (one trade can issue one per job). */
function OtherDocuments({ row, onOpen }: { row: SwmsRegisterRow; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} aria-label="Show other SWMS">
        <ExternalLink className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      {row.documents.slice(1).map((d) => (
        <Button key={d.id} size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => onOpen(d.id)}>
          {d.number} v{d.issuedVersion ?? d.version}
          <SwmsStatusChip status={d.status} className="ml-1 text-[10px]" />
        </Button>
      ))}
    </div>
  );
}
