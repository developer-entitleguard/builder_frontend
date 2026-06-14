import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SalesShell } from "@/components/sales/SalesShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetInvoicesQuery } from "@/store/api";

/**
 * Payments are recorded against invoices (there is no standalone payment
 * resource), so this view derives the payment register from PAID invoices —
 * each paid invoice represents one recorded payment.
 */
const Payments = () => {
  const { data, isLoading } = useGetInvoicesQuery({ page: 0, size: 200 });

  const paid = useMemo(
    () => (data?.content ?? []).filter((inv) => inv.status === "PAID" || inv.paidAt),
    [data],
  );

  return (
    <SalesShell>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Payments</h1>
        <Card>
          <CardHeader>
            <CardTitle>Recorded payments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
            ) : paid.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No payments yet. Record a payment against an invoice to see it here.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Paid on</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paid.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link to={`/invoices/${inv.id}`} className="text-primary underline">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.customerName || "—"}</TableCell>
                      <TableCell>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {inv.currency || "AUD"} {Number(inv.total ?? 0).toFixed(2)}
                      </TableCell>
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

export default Payments;
