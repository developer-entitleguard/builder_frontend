import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Trash2, Wrench } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLazyLookupAssigneeOrgQuery, type AssigneeLookupApi } from "@/store/api/complianceDocuments";
import {
  ITEM_CLASSES,
  itemClassLabel,
  nominatedTradesErrorMessage,
  useAddNominatedTradeMutation,
  useGetNominatedTradesQuery,
  useRemoveNominatedTradeMutation,
  type ItemClass,
  type NominatedTrade,
} from "@/store/api/nominatedTrades";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Trade picker. Reuses the compliance assignment lookup
 * (GET /api/builder/compliance/org-lookup): the builder types a trade
 * contact's email and it resolves to their organisation. Only TRADE orgs can
 * be nominated.
 */
const TradeLookup = ({ onResolved }: { onResolved: (match: AssigneeLookupApi | null) => void }) => {
  const [email, setEmail] = useState("");
  const [match, setMatch] = useState<AssigneeLookupApi | null>(null);
  const [trigger, { isFetching }] = useLazyLookupAssigneeOrgQuery();

  useEffect(() => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setMatch(null);
      onResolved(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await trigger(trimmed).unwrap();
        const m = res?.data ?? null;
        setMatch(m);
        onResolved(m?.matched && m.orgType === "TRADE" ? m : null);
      } catch {
        setMatch(null);
        onResolved(null);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [email, trigger, onResolved]);

  const valid = EMAIL_RE.test(email.trim());
  const isTrade = !!match?.matched && match.orgType === "TRADE";

  return (
    <div className="space-y-2">
      <Label htmlFor="nominate-email">Trade contact email</Label>
      <div className="relative">
        <Input
          id="nominate-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@trade.com.au"
        />
        {isFetching && (
          <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>
      {valid && !isFetching && isTrade && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>
            <strong>{match?.orgName}</strong>
          </span>
        </div>
      )}
      {valid && !isFetching && match && !isTrade && (
        <p className="text-sm text-muted-foreground">
          {match.matched
            ? "That email belongs to a supplier, not a trade. Only trades can be nominated."
            : "No trade on EntitleGuard uses that email."}
        </p>
      )}
    </div>
  );
};

const AddNomination = () => {
  const { toast } = useToast();
  const [trade, setTrade] = useState<AssigneeLookupApi | null>(null);
  const [itemClass, setItemClass] = useState<ItemClass | "">("");
  const [formKey, setFormKey] = useState(0);
  const [add, { isLoading }] = useAddNominatedTradeMutation();

  const canAdd = !!trade?.orgId && !!itemClass && !isLoading;

  const submit = async () => {
    if (!trade?.orgId || !itemClass) return;
    try {
      await add({ tradeOrgId: trade.orgId, itemClass }).unwrap();
      toast({ title: "Trade nominated", description: `${trade.orgName ?? "Trade"} for ${itemClassLabel(itemClass)}` });
      setTrade(null);
      setItemClass("");
      setFormKey((k) => k + 1);
    } catch (err) {
      toast({ title: "Could not nominate", description: nominatedTradesErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nominate a trade</CardTitle>
        <CardDescription>
          Homeowners see your nominated trades when an item in their home is due for service.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <TradeLookup key={formKey} onResolved={setTrade} />
        <div className="space-y-2">
          <Label htmlFor="nominate-class">Item</Label>
          <Select value={itemClass} onValueChange={(v) => setItemClass(v as ItemClass)}>
            <SelectTrigger id="nominate-class">
              <SelectValue placeholder="Choose an item" />
            </SelectTrigger>
            <SelectContent>
              {ITEM_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {itemClassLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="sm:mt-8" onClick={submit} disabled={!canAdd}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Service Due nominated trades (Revenue Capabilities SD13). SERVICE_DUE
 * module, Administrator only. The builder names the trades it recommends for
 * each item class, grouped here by item.
 */
const NominatedTrades = () => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetNominatedTradesQuery();
  const [remove, { isLoading: removing, originalArgs: removingId }] = useRemoveNominatedTradeMutation();

  const groups = useMemo(() => {
    const byClass = new Map<string, NominatedTrade[]>();
    for (const n of data ?? []) {
      const list = byClass.get(n.itemClass) ?? [];
      list.push(n);
      byClass.set(n.itemClass, list);
    }
    const order = (c: string) => {
      const i = (ITEM_CLASSES as readonly string[]).indexOf(c);
      return i < 0 ? ITEM_CLASSES.length : i;
    };
    return [...byClass.entries()].sort((a, b) => order(a[0]) - order(b[0]));
  }, [data]);

  const tradeName = (n: NominatedTrade) => n.tradeName || `Trade ${n.tradeOrgId.slice(0, 8)}`;

  const onRemove = async (n: NominatedTrade) => {
    try {
      await remove(n.id).unwrap();
      toast({ title: "Nomination removed" });
    } catch (err) {
      toast({ title: "Could not remove", description: nominatedTradesErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-7 w-7" />
            Nominated trades
          </h1>
          <p className="text-muted-foreground mt-1">
            The trades you recommend to your homeowners, for each item in their home.
          </p>
        </div>

        <AddNomination />

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{nominatedTradesErrorMessage(error, "Could not load nominated trades")}</p>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No trades nominated yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(([cls, rows]) => (
              <Card key={cls}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{itemClassLabel(cls)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {rows.map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="flex items-center gap-2 text-sm min-w-0">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{tradeName(n)}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(n)}
                          disabled={removing && removingId === n.id}
                          aria-label={`Remove ${tradeName(n)} from ${itemClassLabel(cls)}`}
                        >
                          {removing && removingId === n.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="ml-1">Remove</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NominatedTrades;
