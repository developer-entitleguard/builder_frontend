import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Mail, Paperclip, RotateCcw, Upload } from "lucide-react";
import {
  pastHomesErrorMessage,
  useAssignPastHomeFileMutation,
  useConfirmPastHomeContactMutation,
  useGetPastHomeBatchQuery,
  useMarkPastHomeOwnerChangedMutation,
  useRollbackPastHomeBatchMutation,
  useSendPastHomeInvitationsMutation,
  useSkipPastHomeRowMutation,
  useUploadPastHomeFilesMutation,
  type InviteResult,
  type PastHomeFile,
  type PastHomeRow,
  type RowView,
} from "@/store/api/pastHomes";
import { CoverChips, FileStatusBadge, RowStatusBadge } from "@/components/pastHomes/PastHomesBadges";
import { activationLabel, fmtDate, humanise, isAnyFileStored } from "@/components/pastHomes/pastHomesCopy";

const FILE_ACCEPT = ".pdf,.zip,image/*,application/pdf,application/zip";

const homeAddress = (r: PastHomeRow): string =>
  [r.unitNumber ? `${r.unitNumber}/` : "", r.address ?? "", r.suburb ? `, ${r.suburb}` : "", r.state ? ` ${r.state}` : "", r.postcode ? ` ${r.postcode}` : ""]
    .join("")
    .trim() || "No address";

const ownerName = (r: PastHomeRow): string =>
  [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(" ") || "—";

/** Small confirm wrapper so one-click row actions still ask first. */
const ConfirmButton = ({
  label,
  title,
  description,
  onConfirm,
  disabled,
  variant = "outline",
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
  variant?: "outline" | "ghost" | "destructive";
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button size="sm" variant={variant} disabled={disabled}>
        {label}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>{label}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const PastHomeBatchPage = () => {
  const { batchId = "" } = useParams<{ batchId: string }>();
  const { toast } = useToast();

  const [pollMs, setPollMs] = useState(0);
  const { data, isLoading, error } = useGetPastHomeBatchQuery(
    { batchId },
    { skip: !batchId, pollingInterval: pollMs },
  );

  // Files are read in the background; keep polling while any is still STORED.
  const allFiles: PastHomeFile[] = data
    ? [...data.unassignedFiles, ...data.rows.flatMap((r) => r.files)]
    : [];
  const wantPoll = isAnyFileStored(allFiles) ? 4000 : 0;
  if (wantPoll !== pollMs) setPollMs(wantPoll);

  const [uploadFiles, { isLoading: uploading }] = useUploadPastHomeFilesMutation();
  const [assignFile] = useAssignPastHomeFileMutation();
  const [skipRow] = useSkipPastHomeRowMutation();
  const [ownerChanged] = useMarkPastHomeOwnerChangedMutation();
  const [rollback, { isLoading: rollingBack }] = useRollbackPastHomeBatchMutation();
  const [confirmContact, { isLoading: confirmingContact }] = useConfirmPastHomeContactMutation();
  const [sendInvites, { isLoading: sending }] = useSendPastHomeInvitationsMutation();

  const batchFileRef = useRef<HTMLInputElement>(null);
  const rowFileRef = useRef<HTMLInputElement>(null);
  const [uploadRowId, setUploadRowId] = useState<string | null>(null);
  const [basis, setBasis] = useState("");
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const fail = (title: string, e: unknown) =>
    toast({ title, description: pastHomesErrorMessage(e), variant: "destructive" });

  const doUpload = async (files: FileList | null, rowId: string | null) => {
    if (!files || files.length === 0) return;
    try {
      const out = await uploadFiles({ batchId, rowId, files: Array.from(files) }).unwrap();
      toast({
        title: `${out.length} file${out.length === 1 ? "" : "s"} uploaded`,
        description: "We are reading them now. Suggested values appear when they are ready.",
      });
    } catch (e) {
      fail("Could not upload the files", e);
    } finally {
      if (batchFileRef.current) batchFileRef.current.value = "";
      if (rowFileRef.current) rowFileRef.current.value = "";
    }
  };

  const run = async (p: Promise<unknown>, ok: string, bad: string) => {
    try {
      await p;
      toast({ title: ok });
    } catch (e) {
      fail(bad, e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-destructive">{pastHomesErrorMessage(error, "Could not load this import")}</p>
          <Button asChild variant="link" className="px-0">
            <Link to="/past-homes">Back to Past Homes</Link>
          </Button>
        </main>
      </div>
    );
  }

  const { batch, rows, unassignedFiles } = data;
  const rolledBack = batch.status === "ROLLED_BACK";
  const contactConfirmed = !!batch.contactConfirmedAt;
  const openRow = (r: RowView) => r.row.status === "PROPOSED" || r.row.status === "ERROR";
  const errorRows = rows.filter((r) => r.row.status === "ERROR" || r.row.error);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button asChild variant="link" className="px-0 h-auto mb-1">
              <Link to="/past-homes">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Past Homes
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {batch.fileName || "Untitled import"}
              {rolledBack && <Badge variant="secondary">Rolled back</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              Imported {fmtDate(batch.createdAt)}. {rows.length} home{rows.length === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => batchFileRef.current?.click()} disabled={uploading || rolledBack}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading…" : "Upload handover files"}
            </Button>
            <input
              ref={batchFileRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={(e) => doUpload(e.target.files, null)}
            />
            <input
              ref={rowFileRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={(e) => doUpload(e.target.files, uploadRowId)}
            />
            {!rolledBack && (
              <ConfirmButton
                label="Roll back import"
                title="Roll back this import?"
                description="Homes not yet confirmed are skipped and the import is closed. Homes you already confirmed stay on record. You cannot undo a rollback."
                variant="destructive"
                disabled={rollingBack}
                onConfirm={() => run(rollback({ batchId }).unwrap(), "Import rolled back", "Could not roll back")}
              />
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload PDFs, photos or a single zip of handover documents. Files whose address matches a home are
          linked to it automatically; the rest appear under “Files not linked to a home”.
        </p>

        {errorRows.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>{errorRows.length} home{errorRows.length === 1 ? " needs" : "s need"} fixing</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm">
                {errorRows.map((r) => (
                  <li key={r.row.id}>
                    Row {r.row.rowNumber}: {r.row.error || "Check this row"}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Homes</CardTitle>
            <CardDescription>
              The defect periods show where each home sits today against the statutory periods for its state.
              “Unclear” means we could not work it out, usually because the state or completion date is missing.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Row</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invitation</TableHead>
                  <TableHead>Defect periods</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((rv) => {
                  const r = rv.row;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div>{homeAddress(r)}</div>
                        {r.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(r.completionDate) || "—"}</TableCell>
                      <TableCell>
                        <div>{ownerName(r)}</div>
                        {r.ownerEmail && <div className="text-xs text-muted-foreground">{r.ownerEmail}</div>}
                      </TableCell>
                      <TableCell>
                        <RowStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-sm min-w-[160px]">
                        <div>{activationLabel(r.activationState)}</div>
                        {r.activationState === "NOT_OWNER" && r.notOwnerAt && (
                          <div className="text-xs text-muted-foreground">{fmtDate(r.notOwnerAt)}</div>
                        )}
                        {r.activationState === "INVITED" && r.invitedAt && (
                          <div className="text-xs text-muted-foreground">{fmtDate(r.invitedAt)}</div>
                        )}
                        {r.activationState === "REMINDED" && r.remindedAt && (
                          <div className="text-xs text-muted-foreground">{fmtDate(r.remindedAt)}</div>
                        )}
                        {r.activationState === "ACTIVATED" && r.activatedAt && (
                          <div className="text-xs text-muted-foreground">{fmtDate(r.activatedAt)}</div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <CoverChips positions={rv.coverPosition} />
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1">
                          {rv.files.map((f) => (
                            <div key={f.id} className="flex items-center gap-1 text-xs">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]" title={f.fileName ?? undefined}>
                                {f.fileName}
                              </span>
                              <FileStatusBadge file={f} />
                            </div>
                          ))}
                          {!rolledBack && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              disabled={uploading}
                              onClick={() => {
                                setUploadRowId(r.id);
                                rowFileRef.current?.click();
                              }}
                            >
                              <Paperclip className="h-3 w-3 mr-1" />
                              Add files
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          {openRow(rv) && !rolledBack && (
                            <>
                              <Button asChild size="sm">
                                <Link to={`/past-homes/${batchId}/rows/${r.id}`}>Check and confirm</Link>
                              </Button>
                              <ConfirmButton
                                label="Skip"
                                title={`Skip row ${r.rowNumber}?`}
                                description="This home will not be added and its owner will not be invited."
                                onConfirm={() =>
                                  run(skipRow({ batchId, rowId: r.id }).unwrap(), "Home skipped", "Could not skip")
                                }
                              />
                            </>
                          )}
                          {r.status !== "SKIPPED" &&
                            r.activationState !== "ACTIVATED" &&
                            r.activationState !== "OWNER_CHANGED" &&
                            !rolledBack && (
                              <ConfirmButton
                                label="Owner changed / sold"
                                variant="ghost"
                                title="Owner changed or home sold?"
                                description="We will not send this owner an invitation or reminder, and any link already sent stops working."
                                onConfirm={() =>
                                  run(
                                    ownerChanged({ batchId, rowId: r.id }).unwrap(),
                                    "Marked as owner changed",
                                    "Could not update the home",
                                  )
                                }
                              />
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {unassignedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Files not linked to a home</CardTitle>
              <CardDescription>Choose the home each file belongs to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {unassignedFiles.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-3 border rounded-md p-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{f.fileName}</span>
                  {f.documentClass && (
                    <span className="text-xs text-muted-foreground">{humanise(f.documentClass)}</span>
                  )}
                  <FileStatusBadge file={f} />
                  <div className="ml-auto w-72">
                    <Select
                      disabled={rolledBack}
                      onValueChange={(rowId) =>
                        run(
                          assignFile({ batchId, fileId: f.id, rowId }).unwrap(),
                          "File linked to the home",
                          "Could not link the file",
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to a home…" />
                      </SelectTrigger>
                      <SelectContent>
                        {rows.map((rv) => (
                          <SelectItem key={rv.row.id} value={rv.row.id}>
                            Row {rv.row.rowNumber}: {homeAddress(rv.row)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact owners
            </CardTitle>
            <CardDescription>
              Before we email anyone, tell us why you may contact these owners. We record your answer with
              your name and the date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contactConfirmed ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-medium">Confirmed on {fmtDate(batch.contactConfirmedAt)}</div>
                <div className="text-muted-foreground mt-1">{batch.contactBasis}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="ph-basis">Why may you contact these owners?</Label>
                <Textarea
                  id="ph-basis"
                  value={basis}
                  maxLength={500}
                  onChange={(e) => setBasis(e.target.value)}
                  placeholder="For example: they are our customers under their building contract, which allows us to contact them about their home."
                  disabled={rolledBack}
                />
                <Button
                  onClick={() =>
                    run(
                      confirmContact({ batchId, basis: basis.trim() }).unwrap(),
                      "Contact confirmed",
                      "Could not record the confirmation",
                    )
                  }
                  disabled={!basis.trim() || confirmingContact || rolledBack}
                >
                  {confirmingContact ? "Saving…" : "Confirm I may contact these owners"}
                </Button>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Invitations go to confirmed homes that have an owner email. They are sent in small groups over
                time, not all at once. If an owner has not responded, they get one reminder 14 days later, and
                nothing after that.
              </p>
              <Button
                onClick={async () => {
                  try {
                    const res = await sendInvites({ batchId }).unwrap();
                    setInviteResult(res);
                  } catch (e) {
                    fail("Could not send invitations", e);
                  }
                }}
                disabled={!contactConfirmed || sending || rolledBack}
              >
                <Mail className="h-4 w-4 mr-2" />
                {sending ? "Sending…" : "Send invitations"}
              </Button>
              {!contactConfirmed && (
                <p className="text-xs text-muted-foreground">Confirm you may contact these owners first.</p>
              )}
              {inviteResult && (
                <div className="rounded-md border p-3 text-sm grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <div className="text-lg font-semibold">{inviteResult.queued}</div>
                    <div className="text-muted-foreground text-xs">Queued to send</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{inviteResult.alreadyInvited}</div>
                    <div className="text-muted-foreground text-xs">Already invited</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{inviteResult.noContact}</div>
                    <div className="text-muted-foreground text-xs">No email address</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{inviteResult.ownerChanged}</div>
                    <div className="text-muted-foreground text-xs">Owner changed or sold</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{inviteResult.notReady}</div>
                    <div className="text-muted-foreground text-xs">Not confirmed yet</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {rolledBack && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <RotateCcw className="h-4 w-4" /> This import was rolled back. Homes confirmed before the rollback stay on record.
          </p>
        )}
      </main>
    </div>
  );
};

export default PastHomeBatchPage;
