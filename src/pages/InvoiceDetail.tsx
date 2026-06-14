import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, Send } from "lucide-react";
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
  useGetInvoiceQuery,
  useResendInvoiceMutation,
  useMarkInvoicePaidMutation,
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

const InvoiceDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: inv, isLoading, refetch } = useGetInvoiceQuery(id, { skip: !id });
  const [resend, { isLoading: resending }] = useResendInvoiceMutation();
  const [markPaid, { isLoading: marking }] = useMarkInvoicePaidMutation();
  const [paying, setPaying] = useState(false);
  const [payment, setPayment] = useState<BuilderPaymentDto>(initialPayment());

  if (isLoading || !inv) {
    return (
      <SalesShell>
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground text-center">
            Loading invoice…
          </CardContent>
        </Card>
      </SalesShell>
    );
  }

  const downloadPdf = async () => {
    const token = builderJwt();
    const res = await fetch(invoicePdfUrl(inv.id), {
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
    a.download = `${inv.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onResend = async () => {
    try {
      const result = await resend(inv.id).unwrap();
      const parts: string[] = [];
      parts.push(
        result.emailSent
          ? `emailed to ${result.recipient ?? "customer"}`
          : result.recipient
          ? "email failed"
          : "no customer email on file",
      );
      parts.push(result.pushSent ? "push sent" : "push skipped (no FCM token)");
      toast({
        title: "Resend complete",
        description: parts.join(" · "),
        variant: result.emailSent ? "default" : "destructive",
      });
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Resend failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markPaid({ id: inv.id, payment }).unwrap();
      toast({
        title: "Payment recorded",
        description: `${inv.invoiceNumber} marked PAID.`,
      });
      setPaying(false);
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

  const currency = inv.currency || "AUD";
  const canRecordPayment = inv.status === "UNPAID" || inv.status === "OVERDUE";

  return (
    <SalesShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold">{inv.invoiceNumber}</h1>
            <Badge variant={STATUS_VARIANT[inv.status] ?? "secondary"}>{inv.status}</Badge>
            <Badge variant="default">{inv.invoiceType}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {canRecordPayment && (
              <Button
                size="sm"
                onClick={() => {
                  setPaying(true);
                  setPayment(initialPayment());
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Record payment
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={downloadPdf} title="Download PDF">
              <Download className="h-4 w-4 mr-1" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onResend}
              disabled={resending}
              title="Re-send invoice email + push to the customer"
            >
              <Send className="h-4 w-4 mr-1" />
              {resending ? "Sending…" : "Resend to customer"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Issued</div>
              <div>{inv.issuedAt ? new Date(inv.issuedAt).toLocaleString() : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Payment due</div>
              <div>{inv.paymentDueDate ? new Date(inv.paymentDueDate).toLocaleDateString() : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Paid</div>
              <div>{inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"}</div>
            </div>
            {inv.quoteId && (
              <div>
                <div className="text-muted-foreground">Source quote</div>
                <div>
                  <Link to={`/quotes/${inv.quoteId}`} className="text-primary underline">
                    {inv.quoteId}
                  </Link>
                </div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">Order id</div>
              <div className="break-all">{inv.orderId || "—"}</div>
            </div>
          </CardContent>
        </Card>

        {inv.paymentInstructionsSnapshot && (
          <Card>
            <CardHeader>
              <CardTitle>Payment instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line">
              {inv.paymentInstructionsSnapshot}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Name</div>
              <div className="font-medium">{inv.customerName || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Email</div>
              <div>{inv.customerEmail || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Phone</div>
              <div>{inv.customerPhone || "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Disc %</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(inv.lines ?? []).map((line) => (
                  <TableRow key={line.id ?? line.lineNumber}>
                    <TableCell>{line.lineNumber}</TableCell>
                    <TableCell className="font-medium">{line.nameSnapshot}</TableCell>
                    <TableCell>{line.skuSnapshot ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(line.qty).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(line.unitPriceExTax).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(line.discountPercent ?? 0).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(line.taxAmount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {Number(line.lineTotal ?? 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm tabular-nums">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{Number(inv.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>{Number(inv.discount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{Number(inv.tax ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total ({currency})</span>
                <span>{Number(inv.total ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {inv.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line">{inv.notes}</CardContent>
          </Card>
        )}

        <Dialog open={paying} onOpenChange={(open) => !open && setPaying(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record payment for {inv.invoiceNumber}</DialogTitle>
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
                <Button type="button" variant="outline" onClick={() => setPaying(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={marking}>
                  {marking ? "Recording…" : "Record payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </SalesShell>
  );
};

export default InvoiceDetail;
