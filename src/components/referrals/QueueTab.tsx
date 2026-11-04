import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  referralsErrorMessage,
  useGetReferralQueueQuery,
  useSetReferralStatusMutation,
  type ReferralQueueRow,
  type ReferralStaffStatus,
} from "@/store/api/referrals";
import { STATUS_LABEL, STATUS_VARIANT, fmtDate, statusOptions } from "./referralsCopy";
import { LinkHomeDialog } from "./LinkHomeDialog";

const StatusSelect = ({ row }: { row: ReferralQueueRow }) => {
  const { toast } = useToast();
  const [setStatus, { isLoading }] = useSetReferralStatusMutation();
  const options = statusOptions(row.rewardTerms);

  const onChange = async (status: string) => {
    try {
      await setStatus({ id: row.id, status: status as ReferralStaffStatus }).unwrap();
      toast({ title: `Marked ${STATUS_LABEL[status as ReferralStaffStatus].toLowerCase()}` });
    } catch (e) {
      toast({ title: "Could not change the status", description: referralsErrorMessage(e), variant: "destructive" });
    }
  };

  // NEW is never set by staff; show it as a placeholder until the first change.
  const value = row.status === "NEW" ? undefined : row.status;
  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="w-44" aria-label="Change status">
        <SelectValue placeholder="Change status" />
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
        {/* Keep a reward status visible if it was somehow set, so the trigger has a label. */}
        {value && !options.includes(value as ReferralStaffStatus) && (
          <SelectItem value={value} disabled>
            {STATUS_LABEL[row.status]}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

/** The referral queue (VR8, VR11): friends who asked to be contacted. */
export const QueueTab = () => {
  const { data: rows, isLoading, error } = useGetReferralQueueQuery();
  const [linking, setLinking] = useState<ReferralQueueRow | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral queue</CardTitle>
        <CardDescription>
          Friends of your owners who asked you to get in touch. Update each one as it moves along.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{referralsErrorMessage(error, "Could not load the queue")}</p>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Friend</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Home</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const redacted = !r.friendName && !r.friendEmail && !r.friendPhone;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.friendName || (redacted ? "Details removed" : "—")}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.submittedAt ? `Received ${fmtDate(r.submittedAt)}` : ""}
                          {r.termsVersion != null ? ` · Terms v${r.termsVersion}` : ""}
                          {!r.rewardTerms ? " · No reward" : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.friendEmail && (
                          <a className="block text-primary hover:underline" href={`mailto:${r.friendEmail}`}>
                            {r.friendEmail}
                          </a>
                        )}
                        {r.friendPhone && (
                          <a className="block text-primary hover:underline" href={`tel:${r.friendPhone}`}>
                            {r.friendPhone}
                          </a>
                        )}
                        {!r.friendEmail && !r.friendPhone && "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs whitespace-pre-wrap">{r.friendNote || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusSelect row={r} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.referredRegistrationId ? (
                          <Link to={`/registration/${r.referredRegistrationId}`} className="text-primary hover:underline">
                            View home
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setLinking(r)}>
                            Link to a home
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <LinkHomeDialog
        referralId={linking?.id ?? null}
        friendName={linking?.friendName ?? null}
        onOpenChange={(o) => {
          if (!o) setLinking(null);
        }}
      />
    </Card>
  );
};

export default QueueTab;
