import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Check, X, Copy, FileCheck } from "lucide-react";
import { SalesShell } from "@/components/sales/SalesShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuoteForm } from "@/components/sales/QuoteForm";
import { useToast } from "@/hooks/use-toast";
import {
  useGetQuoteQuery,
  useUpsertQuoteMutation,
  useSendQuoteMutation,
  useAcceptQuoteMutation,
  useRejectQuoteMutation,
  useIssueInvoiceFromQuoteMutation,
  type QuoteDto,
} from "@/store/api";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "warning",
  VIEWED: "warning",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "destructive",
};

const QuoteDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: quote, isLoading, refetch } = useGetQuoteQuery(id, { skip: !id });

  const [editing, setEditing] = useState(false);
  const [upsert, { isLoading: saving }] = useUpsertQuoteMutation();
  const [send, { isLoading: sending }] = useSendQuoteMutation();
  const [accept] = useAcceptQuoteMutation();
  const [reject] = useRejectQuoteMutation();
  const [convert, { isLoading: converting }] = useIssueInvoiceFromQuoteMutation();

  const [convertOpen, setConvertOpen] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  if (isLoading || !quote) {
    return (
      <SalesShell>
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground text-center">
            Loading quote…
          </CardContent>
        </Card>
      </SalesShell>
    );
  }

  const onSave = async (dto: QuoteDto) => {
    try {
      await upsert({ ...dto, id }).unwrap();
      toast({ title: "Quote updated" });
      setEditing(false);
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onSend = async () => {
    try {
      const result = await send(id).unwrap();
      setPublicUrl(result.publicUrl);
      toast({
        title: "Quote sent",
        description: quote.customerEmail
          ? `Emailed to ${quote.customerEmail}. Public link copied to clipboard.`
          : "No customer email on file — share the link below.",
      });
      navigator.clipboard?.writeText(result.publicUrl).catch(() => {});
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Send failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onAccept = async () => {
    try {
      await accept(id).unwrap();
      toast({ title: "Quote accepted" });
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Accept failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onReject = async () => {
    const reason = window.prompt("Reason (optional):") ?? undefined;
    try {
      await reject({ id, reason }).unwrap();
      toast({ title: "Quote rejected" });
      refetch();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Reject failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onConvert = async () => {
    try {
      const invoice = await convert({
        quoteId: id,
        paymentInstructions: paymentInstructions || undefined,
        paymentDueDate: paymentDueDate || undefined,
      }).unwrap();
      toast({ title: "Invoice issued", description: invoice.invoiceNumber });
      setConvertOpen(false);
      navigate("/invoices");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Conversion failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (editing) {
    return (
      <SalesShell>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Cancel edit
            </Button>
            <h1 className="text-2xl font-semibold">Edit {quote.quoteNumber}</h1>
          </div>
          <QuoteForm initial={quote} onSubmit={onSave} submitting={saving} submitLabel="Save changes" />
        </div>
      </SalesShell>
    );
  }

  const editable = quote.status === "DRAFT";
  const canSend = quote.status === "DRAFT";
  const canDecide = quote.status === "SENT" || quote.status === "VIEWED";
  const canConvert = quote.status === "ACCEPTED" && !quote.linkedInvoiceId;

  return (
    <SalesShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold">{quote.quoteNumber}</h1>
            <Badge variant={STATUS_VARIANT[quote.status ?? ""] ?? "secondary"}>{quote.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {canSend && (
              <Button size="sm" onClick={onSend} disabled={sending}>
                <Send className="h-4 w-4 mr-1" />
                {sending ? "Sending…" : "Send"}
              </Button>
            )}
            {canDecide && (
              <>
                <Button variant="outline" size="sm" onClick={onAccept}>
                  <Check className="h-4 w-4 mr-1" />
                  Mark accepted
                </Button>
                <Button variant="outline" size="sm" onClick={onReject}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {canConvert && (
              <Button size="sm" onClick={() => setConvertOpen(true)}>
                <FileCheck className="h-4 w-4 mr-1" />
                Convert to invoice
              </Button>
            )}
            {quote.linkedInvoiceId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/invoices/${quote.linkedInvoiceId}`)}
              >
                <FileCheck className="h-4 w-4 mr-1" />
                View invoice
              </Button>
            )}
          </div>
        </div>

        {publicUrl && (
          <Card>
            <CardContent className="py-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Public link: </span>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                  {publicUrl}
                </a>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(publicUrl)}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
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
              <div className="font-medium">{quote.customerName || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Email</div>
              <div>{quote.customerEmail || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Phone</div>
              <div>{quote.customerPhone || "—"}</div>
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
                {(quote.lines ?? []).map((line) => (
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
                <span>{Number(quote.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>{Number(quote.discount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{Number(quote.tax ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total ({quote.currency})</span>
                <span>{Number(quote.total ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line">{quote.notes}</CardContent>
          </Card>
        )}

        <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to invoice</DialogTitle>
              <DialogDescription>
                Issues an UNPAID tax invoice from this accepted quote. Recording a payment later
                materialises the order + entitlements.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Payment due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instructions">Override payment instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Leave blank to use the org default."
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConvertOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onConvert} disabled={converting}>
                {converting ? "Issuing…" : "Issue invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SalesShell>
  );
};

export default QuoteDetail;
