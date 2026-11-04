import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Undo2 } from "lucide-react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import NewRecoveryCaseDialog from "@/components/recovery/NewRecoveryCaseDialog";
import {
  fmtMoney,
  fmtRecoveryDate,
  recoveryErrorMessage,
  targetTypeLabel,
  useGetRecoveryCasesQuery,
} from "@/store/api/recovery";

/**
 * Recovery cases (Revenue Capabilities Track G, DR1 to DR16). DEFECT_RECOVERY
 * module; Administrator and Customer Support (RECOVERY_RAISE). Cases the
 * business raised to recover the cost to rectify a defect from the recipient
 * the record links it to. Entitle Guard records; it never judges.
 */
const RecoveryCases = () => {
  const { data: rows, isLoading, error } = useGetRecoveryCasesQuery();
  const [creating, setCreating] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Undo2 className="h-7 w-7" />
              Recovery cases
            </h1>
            <p className="text-muted-foreground mt-1">
              Defects you have fixed, linked to the work the record shows, with the cost to rectify.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New case
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{recoveryErrorMessage(error, "Could not load recovery cases")}</p>
        ) : !rows || rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No recovery cases yet. Start one from an owner's query, or with New case.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Defect</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cost to rectify</TableHead>
                    <TableHead className="text-right">Recovered</TableHead>
                    <TableHead>Reply by</TableHead>
                    <TableHead>Raised</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link to={`/recovery/cases/${r.id}`} className="text-primary hover:underline">
                          {r.title || "Defect"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {r.targetName ? (
                          <>
                            {r.targetName}
                            {r.targetType && (
                              <div className="text-xs text-muted-foreground">{targetTypeLabel(r.targetType)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Not chosen</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.statusLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(r.costAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.recoveredTotal ? fmtMoney(r.recoveredTotal) : ""}
                      </TableCell>
                      <TableCell className="tabular-nums">{fmtRecoveryDate(r.responseDueOn)}</TableCell>
                      <TableCell className="tabular-nums">{fmtRecoveryDate(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
      <NewRecoveryCaseDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
};

export default RecoveryCases;
