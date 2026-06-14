import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download } from "lucide-react";
import { SalesShell } from "@/components/sales/SalesShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  invoicePdfUrl,
  useGetInvoicesQuery,
  useMarkInvoicePaidMutation,
  type BuilderInvoiceDto,
  type BuilderPaymentDto,
} from "@/store/api";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  UNPAID: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "BPAY", label: "BPAY" },
  { value: "OTHER", label: "Other" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const initialPayment = (): BuilderPaymentDto => ({
  paymentDate: todayIso(),
  amount: 0,
  currency: "AUD",
  method: "BANK_TRANSFER",
  reference: "",
  notes: "",
});

const builderJwt = (): string | null => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? (JSON.parse(raw)?.jwt ?? null) : null;
  } catch {
    return null;
  }
};

const Invoices = () => {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useGetInvoicesQuery({ page: 0, size: 100 });
  const [markPaid, { isLoading: marking }] = useMarkInvoicePaidMutation();
  const [paying, setPaying] = useState<BuilderInvoiceDto | null>(null);
  const [payment, setPayment] = useState<BuilderPaymentDto>(initialPayment());
  const rows = data?.content ?? [];

  const onMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    try {
      await markPaid({ id: paying.id, payment }).unwrap();
      toast({
        title: "Payment recorded",
        description: `${paying.invoiceNumber} marked PAID.`,
      });
      setPaying(null);
      setPayment(initialPayment());
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Record-payment failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  // The PDF endpoint requires the JWT, so we fetch with the auth header, blob
  // it, then trigger an in-browser download.
  const downloadPdf = async (id: string, invoiceNumber: string) => {
    const token = builderJwt();
    const res = await fetch(invoicePdfUrl(id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description:
          res.status === 202
            ? "PDF is still being generated. Try again in a few seconds."
            : `HTTP ${res.status}`,
      });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <SalesShell>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <Card>
          <CardHeader>
            <CardTitle>Invoice register</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading invoices…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No invoices yet. Accept a quote on the{" "}
                <Link to="/quotes" className="underline">Quotes</Link> page and convert it to an invoice.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="w-[200px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link to={`/invoices/${inv.id}`} className="text-primary underline">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[inv.status] ?? "secondary"}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {inv.paymentDueDate ? new Date(inv.paymentDueDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === "UNPAID" || inv.status === "OVERDUE") && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPaying(inv);
                                setPayment(initialPayment());
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Record payment
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment for {paying?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Records the payment, flips the invoice to PAID, and materialises the order +
              entitlements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onMarkPaid} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="paymentDate">Payment date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  required
                  value={payment.paymentDate}
                  onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={payment.reference ?? ""}
                  onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={payment.notes ?? ""}
                onChange={(e) => setPayment({ ...payment, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={marking}>
                {marking ? "Recording…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SalesShell>
  );
};

export default Invoices;
