import { Link } from "react-router-dom";
import { ClipboardCheck, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { completionErrorMessage, useGetCompletionOverviewQuery } from "@/store/api/completion";
import {
  ADVISORY_NOTE,
  READINESS_CLASS,
  READINESS_LABEL,
  completionTabPath,
  fmtDay,
  fmtMoney,
  useCompletionAccess,
} from "@/components/completion/completionCopy";
import { ChaseWordingEditor } from "@/components/completion/ChaseWordingEditor";

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

/** Org-wide Completion Gate: homes not yet handed over, and which need action. */
const CompletionOverview = () => {
  const { canManage } = useCompletionAccess();
  const { data, isLoading, error } = useGetCompletionOverviewQuery();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" />
            Completion
          </h1>
          <p className="text-muted-foreground mt-1">
            Homes not yet handed over, and the documents still needed for each. {ADVISORY_NOTE}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !data ? (
          <p className="text-sm text-destructive">{completionErrorMessage(error, "Could not load completion.")}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Homes not yet handed over" value={data.homes} />
              <Stat label="Homes with open items" value={data.homesWithOpenItems} />
              <Stat label="Open items" value={data.openItems} />
              {data.amountWaiting != null && (
                <Stat label="Final claims waiting on documents" value={fmtMoney(data.amountWaiting)} />
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Homes needing action</CardTitle>
                <CardDescription>Soonest target date first.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.homesNeedingAction.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing needs action right now.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Home</TableHead>
                          <TableHead>Target date</TableHead>
                          <TableHead>Readiness</TableHead>
                          <TableHead>Open items</TableHead>
                          <TableHead>Next action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.homesNeedingAction.map((h) => (
                          <TableRow key={h.registrationId}>
                            <TableCell>
                              {h.projectId ? (
                                <Link
                                  to={completionTabPath(h.projectId)}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {h.label}
                                </Link>
                              ) : (
                                <span className="font-medium">{h.label}</span>
                              )}
                              {h.projectName && <p className="text-xs text-muted-foreground">{h.projectName}</p>}
                            </TableCell>
                            <TableCell className="text-sm">{fmtDay(h.targetPcDate)}</TableCell>
                            <TableCell>
                              <Badge className={READINESS_CLASS[h.readiness] ?? ""}>
                                {READINESS_LABEL[h.readiness] ?? h.readiness}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{h.openItems}</TableCell>
                            <TableCell className="text-sm">{h.nextAction ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {canManage && <ChaseWordingEditor />}
      </main>
    </div>
  );
};

export default CompletionOverview;
