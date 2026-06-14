import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { SalesShell } from "@/components/sales/SalesShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetQuotesQuery } from "@/store/api";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "warning",
  VIEWED: "warning",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "destructive",
};

const Quotes = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetQuotesQuery({ page: 0, size: 100 });
  const rows = data?.content ?? [];

  return (
    <SalesShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <Link to="/quotes/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New quote
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading quotes…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No quotes yet. Click "New quote" to create your first one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((q) => (
                    <TableRow
                      key={q.id}
                      className="cursor-pointer"
                      onClick={() => q.id && navigate(`/quotes/${q.id}`)}
                    >
                      <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                      <TableCell>
                        <div>{q.customerName || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {q.customerEmail || q.customerPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[q.status ?? ""] ?? "secondary"}>{q.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {q.currency} {Number(q.total ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SalesShell>
  );
};

export default Quotes;
