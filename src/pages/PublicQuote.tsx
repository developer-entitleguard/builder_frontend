import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/config";

interface PublicQuoteLine {
  lineNumber: number;
  name: string;
  sku?: string | null;
  qty: number;
  unitPriceExTax: number;
  lineTotal: number;
}

interface PublicQuoteData {
  quoteNumber: string;
  status: string;
  merchantName: string;
  merchantAbn?: string | null;
  customerName?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  expiresAt?: string | null;
  notes?: string | null;
  lines: PublicQuoteLine[];
}

/**
 * Customer-facing public quote view. No auth — the signed token in the URL is
 * the credential. Fetches /q/{token} (org-agnostic, token-based) which
 * transitions SENT → VIEWED on first load.
 */
const PublicQuote = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicQuoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${getApiBaseUrl()}/q/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Quote not found (${r.status})`);
        return r.json() as Promise<PublicQuoteData>;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load quote"));
  }, [token]);

  const decide = async (decision: "ACCEPT" | "REJECT") => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/q/${token}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setData((await res.json()) as PublicQuoteData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="container py-10 text-red-600">{error}</div>;
  if (!data) return <div className="container py-10 text-muted-foreground">Loading…</div>;

  const decided = data.status === "ACCEPTED" || data.status === "REJECTED";

  return (
    <div className="min-h-screen container py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            Quote {data.quoteNumber} from {data.merchantName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium">{data.status}</span>
            {data.merchantAbn && <> · ABN {data.merchantAbn}</>}
          </p>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Item</th>
                <th>Qty</th>
                <th>Unit ({data.currency})</th>
                <th>Total ({data.currency})</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.lineNumber} className="border-t">
                  <td className="py-2">
                    <div>{l.name}</div>
                    {l.sku && <div className="text-xs text-muted-foreground">SKU {l.sku}</div>}
                  </td>
                  <td>{l.qty}</td>
                  <td>{l.unitPriceExTax}</td>
                  <td>{l.lineTotal}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td colSpan={3} className="text-right py-2">
                  Total ({data.currency})
                </td>
                <td>{data.total}</td>
              </tr>
            </tfoot>
          </table>

          {data.notes && <p className="mt-6 text-sm whitespace-pre-line">{data.notes}</p>}

          {!decided && (
            <div className="mt-6 flex gap-3">
              <Button onClick={() => decide("ACCEPT")} disabled={submitting}>
                Accept quote
              </Button>
              <Button variant="outline" onClick={() => decide("REJECT")} disabled={submitting}>
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicQuote;
