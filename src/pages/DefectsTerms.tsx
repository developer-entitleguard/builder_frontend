import { useEffect, useMemo, useState } from "react";
import { Building2, FileSignature, Loader2, Pencil, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLazyLookupAssigneeOrgQuery } from "@/store/api/complianceDocuments";
import {
  recoveryErrorMessage,
  useDeleteRecoveryTermsMutation,
  useGetRecoveryTermsQuery,
  useSaveRecoveryTermsMutation,
  type SubcontractTerms,
} from "@/store/api/recovery";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const intIn = (v: string, lo: number, hi: number) => /^\d+$/.test(v.trim()) && +v >= lo && +v <= hi;

type Scope = "DEFAULT" | "TRADE";

const termsName = (t: SubcontractTerms) => (t.tradeOrgId ? t.tradeName || "Unnamed trade" : "Default for all trades");

const TermsForm = ({
  editing,
  onDone,
}: {
  editing: SubcontractTerms | null;
  onDone: () => void;
}) => {
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope>(editing ? (editing.tradeOrgId ? "TRADE" : "DEFAULT") : "DEFAULT");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState<{ id: string; name: string } | null>(
    editing?.tradeOrgId ? { id: editing.tradeOrgId, name: termsName(editing) } : null,
  );
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [months, setMonths] = useState(editing ? String(editing.defectsPeriodMonths) : "");
  const [method, setMethod] = useState(editing?.noticeMethod ?? "");
  const [clause, setClause] = useState(editing?.backChargeClause ?? "");
  const [responseDays, setResponseDays] = useState(editing ? String(editing.responseDays) : "10");
  const [remindDays, setRemindDays] = useState(editing ? String(editing.reminderDaysBefore) : "30");
  const [lookup, { isFetching }] = useLazyLookupAssigneeOrgQuery();
  const [save, { isLoading }] = useSaveRecoveryTermsMutation();

  useEffect(() => {
    if (scope !== "TRADE" || editing) return;
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
  }, [email, scope, editing, lookup]);

  const valid =
    intIn(months, 1, 240) &&
    intIn(responseDays, 1, 90) &&
    intIn(remindDays, 0, 365) &&
    (scope === "DEFAULT" || !!trade);

  const submit = async () => {
    if (!valid) return;
    try {
      await save({
        tradeOrgId: scope === "TRADE" ? trade?.id ?? null : null,
        defectsPeriodMonths: +months,
        noticeMethod: method.trim() || null,
        backChargeClause: clause.trim() || null,
        responseDays: +responseDays,
        reminderDaysBefore: +remindDays,
      }).unwrap();
      toast({ title: "Terms saved" });
      onDone();
    } catch (e) {
      toast({ title: "Could not save the terms", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{editing ? "Edit terms" : "Add terms"}</CardTitle>
        <CardDescription>Terms for one trade replace the default for that trade.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {editing ? (
          <p>
            Applies to: <strong>{termsName(editing)}</strong>
          </p>
        ) : (
          <div className="space-y-2">
            <Label id="terms-scope">Applies to</Label>
            <RadioGroup aria-labelledby="terms-scope" value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="terms-scope-default" value="DEFAULT" />
                <Label htmlFor="terms-scope-default" className="font-normal">
                  Default for all trades
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="terms-scope-trade" value="TRADE" />
                <Label htmlFor="terms-scope-trade" className="font-normal">
                  One trade
                </Label>
              </div>
            </RadioGroup>
            {scope === "TRADE" && (
              <div className="space-y-1">
                <Label htmlFor="terms-trade-email">Trade contact email</Label>
                <div className="relative">
                  <Input id="terms-trade-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="terms-months">Defects period (months)</Label>
            <Input id="terms-months" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="terms-response">Days to reply to a notice</Label>
            <Input id="terms-response" inputMode="numeric" value={responseDays} onChange={(e) => setResponseDays(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="terms-remind">Remind me this many days before the period ends</Label>
            <Input id="terms-remind" inputMode="numeric" value={remindDays} onChange={(e) => setRemindDays(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="terms-method">How notices are given under your contract (optional)</Label>
          <Input id="terms-method" value={method} onChange={(e) => setMethod(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="terms-clause">Back-charge clause (optional)</Label>
          <Textarea id="terms-clause" value={clause} onChange={(e) => setClause(e.target.value)} rows={6} maxLength={8000} />
          <p className="text-xs text-muted-foreground">Your own wording. It is attached to notices as you write it.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={submit} disabled={!valid || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save terms
          </Button>
          {editing && (
            <Button variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Defects terms (Revenue Capabilities DR5). DEFECT_RECOVERY module,
 * Administrator (ORG_MANAGE). The builder's own subcontract terms; Entitle
 * Guard only compares dates against them.
 */
const DefectsTerms = () => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetRecoveryTermsQuery();
  const [remove, { isLoading: removing }] = useDeleteRecoveryTermsMutation();
  const [editing, setEditing] = useState<SubcontractTerms | null>(null);
  const [formKey, setFormKey] = useState(0);

  const rows = useMemo(
    () => [...(data ?? [])].sort((a, b) => (a.tradeOrgId ? 1 : 0) - (b.tradeOrgId ? 1 : 0)),
    [data],
  );

  const done = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
  };

  const onDelete = async (t: SubcontractTerms) => {
    try {
      await remove(t.id).unwrap();
      toast({ title: "Terms removed" });
      if (editing?.id === t.id) done();
    } catch (e) {
      toast({ title: "Could not remove the terms", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSignature className="h-7 w-7" />
            Defects terms
          </h1>
          <p className="text-muted-foreground mt-1">
            These are your own subcontract terms. Entitle Guard only compares dates against them: it shows whether a defect
            falls inside the defects period you set, and attaches your clause to a notice.
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{recoveryErrorMessage(error, "Could not load your terms")}</p>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No terms yet.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {rows.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{termsName(t)}</span>
                        {!t.tradeOrgId && <Badge variant="outline">Default</Badge>}
                      </div>
                      <div className="text-muted-foreground">
                        {t.defectsPeriodMonths} months · reply within {t.responseDays} days · reminder {t.reminderDaysBefore} days
                        before the period ends
                      </div>
                      {t.noticeMethod && <div className="text-muted-foreground">Notices: {t.noticeMethod}</div>}
                      {t.backChargeClause && (
                        <p className="text-muted-foreground line-clamp-2 whitespace-pre-wrap">{t.backChargeClause}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)} aria-label="Edit terms">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(t)} disabled={removing} aria-label="Remove terms">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <TermsForm key={editing ? `edit-${editing.id}` : `new-${formKey}`} editing={editing} onDone={done} />
      </main>
    </div>
  );
};

export default DefectsTerms;
