import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Loader2, Network, Sparkles, X } from "lucide-react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLazyLookupAssigneeOrgQuery } from "@/store/api/complianceDocuments";
import {
  recoveryErrorMessage,
  useCreateScopeMappingMutation,
  useDecideScopeMappingMutation,
  useGetScopeMappingsQuery,
  usePrefillScopeMappingsMutation,
  type ScopeMapping,
} from "@/store/api/recovery";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddMapping = () => {
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState<{ id: string; name: string } | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [compliance, setCompliance] = useState("");
  const [lookup, { isFetching }] = useLazyLookupAssigneeOrgQuery();
  const [create, { isLoading }] = useCreateScopeMappingMutation();

  useEffect(() => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setTrade(null);
      setLookupMsg(null);
      return;
    }
    const h = setTimeout(async () => {
      try {
        const m = (await lookup(trimmed).unwrap())?.data;
        if (m?.matched && m.orgType === "TRADE" && m.orgId) {
          setTrade({ id: m.orgId, name: m.orgName ?? "Trade" });
          setLookupMsg(null);
        } else {
          setTrade(null);
          setLookupMsg(m?.matched ? "That email doesn't belong to a trade." : "No trade on Entitle Guard uses that email.");
        }
      } catch {
        setTrade(null);
      }
    }, 400);
    return () => clearTimeout(h);
  }, [email, lookup]);

  const valid = !!category.trim() && (!!trade || !!compliance.trim()) && !isFetching;

  const submit = async () => {
    if (!valid) return;
    try {
      await create({
        bomCategory: category.trim(),
        tradeOrgId: trade?.id ?? null,
        complianceCategory: compliance.trim() || null,
      }).unwrap();
      toast({ title: "Mapping confirmed" });
      setCategory("");
      setEmail("");
      setCompliance("");
      setTrade(null);
    } catch (e) {
      toast({ title: "Could not add the mapping", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add a mapping</CardTitle>
        <CardDescription>Name a BOM category and the trade or compliance category that covers it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <Label htmlFor="scope-category">BOM category</Label>
          <Input id="scope-category" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scope-trade-email">Trade contact email (optional)</Label>
          <div className="relative">
            <Input id="scope-trade-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {isFetching && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
          </div>
          {trade && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              <Building2 className="h-4 w-4 shrink-0" />
              <strong>{trade.name}</strong>
            </div>
          )}
          {lookupMsg && !isFetching && <p className="text-muted-foreground">{lookupMsg}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="scope-compliance">Compliance category (optional)</Label>
          <Input id="scope-compliance" value={compliance} onChange={(e) => setCompliance(e.target.value)} maxLength={100} />
        </div>
        <Button onClick={submit} disabled={!valid || isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add and confirm
        </Button>
      </CardContent>
    </Card>
  );
};

const STATUS_LABEL: Record<ScopeMapping["status"], string> = {
  PROPOSED: "Proposed",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
};

/**
 * Trade scope (Revenue Capabilities C34, P0). DEFECT_RECOVERY module,
 * Administrator (ORG_MANAGE). Which trade covers which BOM category. Proposed
 * rows come from the builder's own records; only confirmed rows are used to
 * trace a defect to a trade.
 */
const TradeScope = () => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetScopeMappingsQuery();
  const [prefill, { isLoading: prefilling }] = usePrefillScopeMappingsMutation();
  const [decide, { isLoading: deciding }] = useDecideScopeMappingMutation();

  const rows = useMemo(() => {
    const order = { PROPOSED: 0, CONFIRMED: 1, REJECTED: 2 } as const;
    return [...(data ?? [])].sort((a, b) => order[a.status] - order[b.status] || a.bomCategory.localeCompare(b.bomCategory));
  }, [data]);

  const onPrefill = async () => {
    try {
      const r = await prefill().unwrap();
      toast({
        title: r.proposed ? `${r.proposed} suggestion${r.proposed === 1 ? "" : "s"} to review` : "No new suggestions",
        description: r.proposed ? "Confirm or reject each one." : undefined,
      });
    } catch (e) {
      toast({ title: "Could not suggest mappings", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  const onDecide = async (r: ScopeMapping, confirm: boolean) => {
    try {
      await decide({ id: r.id, confirm }).unwrap();
    } catch (e) {
      toast({ title: "Could not save", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Network className="h-7 w-7" />
              Trade scope
            </h1>
            <p className="text-muted-foreground mt-1">
              Which trade covers which part of your bill of materials. Only confirmed rows are used to trace a defect to a
              trade.
            </p>
          </div>
          <Button variant="outline" onClick={onPrefill} disabled={prefilling}>
            {prefilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Suggest from my records
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{recoveryErrorMessage(error, "Could not load trade scope")}</p>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No mappings yet. Suggest some from your records, or add one below.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BOM category</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Compliance category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.bomCategory}</TableCell>
                      <TableCell>{r.tradeName || (r.tradeOrgId ? `Trade ${r.tradeOrgId.slice(0, 8)}` : "")}</TableCell>
                      <TableCell>{r.complianceCategory || ""}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "CONFIRMED" ? "secondary" : "outline"}>{STATUS_LABEL[r.status]}</Badge>
                        {r.status === "PROPOSED" && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Seen on {r.evidenceCount} home{r.evidenceCount === 1 ? "" : "s"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.status === "PROPOSED" && (
                          <>
                            <Button size="sm" variant="outline" className="mr-2" onClick={() => onDecide(r, true)} disabled={deciding}>
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => onDecide(r, false)} disabled={deciding}>
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <AddMapping />
      </main>
    </div>
  );
};

export default TradeScope;
