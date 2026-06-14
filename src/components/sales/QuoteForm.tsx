import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QuoteDto, QuoteLineDto } from "@/store/api";

interface QuoteFormProps {
  initial?: QuoteDto;
  /** Called with the about-to-save payload. Server recomputes line totals. */
  onSubmit: (dto: QuoteDto) => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
}

const newLine = (lineNumber: number): QuoteLineDto => ({
  lineNumber,
  nameSnapshot: "",
  qty: 1,
  unitPriceExTax: 0,
  discountPercent: 0,
  taxRate: 0.1,
});

const emptyQuote: QuoteDto = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  notes: "",
  currency: "AUD",
  lines: [newLine(1)],
};

/**
 * Quote create + edit form. Lines are entered free-text (name, qty, unit, etc.)
 * — the builder catalog isn't wired into the sales quote yet. The server is the
 * source of truth for totals; this preview is purely informational.
 */
export function QuoteForm({ initial, onSubmit, submitting, submitLabel = "Save quote" }: QuoteFormProps) {
  const [quote, setQuote] = useState<QuoteDto>(() => initial ?? emptyQuote);

  const setField = <K extends keyof QuoteDto>(key: K, value: QuoteDto[K]) => {
    setQuote((q) => ({ ...q, [key]: value }));
  };

  const setLine = (idx: number, patch: Partial<QuoteLineDto>) => {
    setQuote((q) => ({
      ...q,
      lines: q.lines.map((line, i) => (i === idx ? { ...line, ...patch } : line)),
    }));
  };

  const addLine = () => {
    setQuote((q) => ({ ...q, lines: [...q.lines, newLine(q.lines.length + 1)] }));
  };

  const removeLine = (idx: number) => {
    setQuote((q) => ({
      ...q,
      lines: q.lines
        .filter((_, i) => i !== idx)
        .map((line, i) => ({ ...line, lineNumber: i + 1 })),
    }));
  };

  // Client-side preview totals; the server recomputes authoritatively.
  const totals = quote.lines.reduce(
    (acc, line) => {
      const qty = Number(line.qty) || 0;
      const unit = Number(line.unitPriceExTax) || 0;
      const disc = Number(line.discountPercent ?? 0) || 0;
      const taxRate = Number(line.taxRate) || 0;
      const gross = qty * unit;
      const net = gross * (1 - disc / 100);
      const tax = net * taxRate;
      acc.subtotal += gross;
      acc.discount += gross - net;
      acc.tax += tax;
      acc.total += net + tax;
      return acc;
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(quote);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customerName">Name</Label>
            <Input
              id="customerName"
              value={quote.customerName ?? ""}
              onChange={(e) => setField("customerName", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={quote.customerEmail ?? ""}
                onChange={(e) => setField("customerEmail", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={quote.customerPhone ?? ""}
                onChange={(e) => setField("customerPhone", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                maxLength={3}
                value={quote.currency ?? "AUD"}
                onChange={(e) => setField("currency", e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiresAt">Expires (date)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={quote.expiresAt ? quote.expiresAt.slice(0, 10) : ""}
                onChange={(e) =>
                  setField("expiresAt", e.target.value ? `${e.target.value}T23:59:59` : null)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[110px]">Unit</TableHead>
                <TableHead className="w-[80px]">Disc %</TableHead>
                <TableHead className="w-[80px]">Tax</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Input
                      placeholder="Item or service name"
                      value={line.nameSnapshot}
                      onChange={(e) => setLine(idx, { nameSnapshot: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.qty}
                      onChange={(e) => setLine(idx, { qty: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPriceExTax}
                      onChange={(e) => setLine(idx, { unitPriceExTax: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={line.discountPercent ?? 0}
                      onChange={(e) => setLine(idx, { discountPercent: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      max="1"
                      value={line.taxRate}
                      onChange={(e) => setLine(idx, { taxRate: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(idx)}
                      disabled={quote.lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes &amp; totals</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (visible to customer)</Label>
            <Textarea
              id="notes"
              value={quote.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm tabular-nums">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>{totals.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total ({quote.currency})</span>
              <span>{totals.total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">Server recomputes these on save.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
