import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  referralsErrorMessage,
  useGetReferralTermsQuery,
  useSetReferralTermsMutation,
  type ReferralTerms,
  type RewardRecipient,
  type RewardTrigger,
} from "@/store/api/referrals";
import {
  RECIPIENT_LABEL,
  REWARD_OWNERSHIP_NOTE,
  TERMS_VERSION_NOTE,
  TRIGGER_LABEL,
  fmtDate,
  fmtMoney,
} from "./referralsCopy";

const RECIPIENTS: RewardRecipient[] = ["NONE", "OWNER", "FRIEND", "BOTH"];
const TRIGGERS: RewardTrigger[] = ["CONTRACT_SIGNED", "HANDOVER"];

interface FormState {
  recipient: RewardRecipient;
  rewardDescription: string;
  rewardAmount: string;
  triggerStage: RewardTrigger | "";
  eligibilityText: string;
}

const fromTerms = (t: ReferralTerms | null | undefined): FormState => ({
  recipient: t?.recipient ?? "NONE",
  rewardDescription: t?.rewardDescription ?? "",
  rewardAmount: t?.rewardAmount != null ? String(t.rewardAmount) : "",
  triggerStage: t?.triggerStage ?? "",
  eligibilityText: t?.eligibilityText ?? "",
});

/** Mirrors ReferralService.setTerms so the form can say what's missing before saving. */
const validate = (f: FormState): Partial<Record<keyof FormState, string>> => {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (f.recipient !== "NONE") {
    if (!f.rewardDescription.trim()) errors.rewardDescription = "Describe the reward";
    if (!f.triggerStage) errors.triggerStage = "Say when the reward is earned";
  }
  if (f.rewardAmount.trim()) {
    const n = Number(f.rewardAmount);
    if (!Number.isFinite(n)) errors.rewardAmount = "Enter an amount in dollars";
    else if (n < 0) errors.rewardAmount = "The reward cannot be negative";
  }
  return errors;
};

const CurrentTerms = ({ terms }: { terms: ReferralTerms }) => (
  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
    <dt className="text-muted-foreground">Version</dt>
    <dd>
      {terms.version}
      {terms.createdAt ? `, saved ${fmtDate(terms.createdAt)}` : ""}
    </dd>
    <dt className="text-muted-foreground">Reward goes to</dt>
    <dd>{RECIPIENT_LABEL[terms.recipient] ?? terms.recipient}</dd>
    {terms.recipient !== "NONE" && (
      <>
        <dt className="text-muted-foreground">Reward</dt>
        <dd>
          {terms.rewardDescription}
          {terms.rewardAmount != null ? ` (${fmtMoney(terms.rewardAmount)})` : ""}
        </dd>
        <dt className="text-muted-foreground">Earned</dt>
        <dd>{terms.triggerStage ? TRIGGER_LABEL[terms.triggerStage] ?? terms.triggerStage : "—"}</dd>
      </>
    )}
    <dt className="text-muted-foreground">Eligibility</dt>
    <dd className="whitespace-pre-wrap">{terms.eligibilityText || "—"}</dd>
  </dl>
);

/** Referral terms (VR5, VR9). Each save is a new version; shares keep theirs. */
export const TermsTab = ({ canEdit }: { canEdit: boolean }) => {
  const { toast } = useToast();
  const { data: terms, isLoading, error } = useGetReferralTermsQuery();
  const [save, { isLoading: saving }] = useSetReferralTermsMutation();
  const [form, setForm] = useState<FormState>(fromTerms(null));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setForm(fromTerms(terms));
    setTouched(false);
  }, [terms]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) {
    return <p className="text-sm text-destructive">{referralsErrorMessage(error, "Could not load the terms")}</p>;
  }

  const errors = validate(form);
  const pays = form.recipient !== "NONE";
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    try {
      const saved = await save({
        recipient: form.recipient,
        rewardDescription: pays ? form.rewardDescription.trim() : null,
        rewardAmount: pays && form.rewardAmount.trim() ? Number(form.rewardAmount) : null,
        triggerStage: pays && form.triggerStage ? form.triggerStage : null,
        eligibilityText: form.eligibilityText.trim() || null,
      }).unwrap();
      toast({ title: `Terms saved as version ${saved.version}` });
    } catch (e) {
      toast({ title: "Could not save the terms", description: referralsErrorMessage(e), variant: "destructive" });
    }
  };

  const fieldError = (k: keyof FormState) =>
    touched && errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <div className="space-y-6">
      <p className="rounded-md border bg-muted/40 p-3 text-sm">{REWARD_OWNERSHIP_NOTE}</p>

      <Card>
        <CardHeader>
          <CardTitle>Current terms</CardTitle>
          <CardDescription>What an owner sees before they share, and what their friend is told.</CardDescription>
        </CardHeader>
        <CardContent>
          {terms ? <CurrentTerms terms={terms} /> : <p className="text-sm text-muted-foreground">No terms set yet.</p>}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{terms ? "Change the terms" : "Set the terms"}</CardTitle>
            <CardDescription>{TERMS_VERSION_NOTE}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="ref-recipient">Who receives a reward</Label>
              <Select value={form.recipient} onValueChange={(v) => set("recipient", v as RewardRecipient)}>
                <SelectTrigger id="ref-recipient">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENTS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {RECIPIENT_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pays && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="ref-desc">Reward</Label>
                  <Input
                    id="ref-desc"
                    maxLength={500}
                    placeholder="e.g. A $500 gift card"
                    value={form.rewardDescription}
                    onChange={(e) => set("rewardDescription", e.target.value)}
                  />
                  {fieldError("rewardDescription")}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ref-amount">Amount in dollars (optional)</Label>
                  <Input
                    id="ref-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.rewardAmount}
                    onChange={(e) => set("rewardAmount", e.target.value)}
                  />
                  {fieldError("rewardAmount")}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ref-trigger">When the reward is earned</Label>
                  <Select value={form.triggerStage} onValueChange={(v) => set("triggerStage", v as RewardTrigger)}>
                    <SelectTrigger id="ref-trigger">
                      <SelectValue placeholder="Choose when" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRIGGER_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError("triggerStage")}
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="ref-elig">Eligibility (optional)</Label>
              <Textarea
                id="ref-elig"
                maxLength={2000}
                rows={4}
                placeholder="Who can be referred, and any conditions"
                value={form.eligibilityText}
                onChange={(e) => set("eligibilityText", e.target.value)}
              />
            </div>

            <Button onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save as a new version
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TermsTab;
