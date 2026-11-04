import { useSearchParams } from "react-router-dom";
import { Megaphone } from "lucide-react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReferralsAccess } from "@/components/referrals/referralsCopy";
import { ProofPageTab } from "@/components/referrals/ProofPageTab";
import { TermsTab } from "@/components/referrals/TermsTab";
import { QueueTab } from "@/components/referrals/QueueTab";
import { ReviewLinksTab } from "@/components/referrals/ReviewLinksTab";

type TabKey = "proof" | "terms" | "queue" | "reviews";

/**
 * Verified Referrals (Revenue Capabilities Track D). REFERRALS module.
 * Proof Page and terms: Administrator. Queue: Administrator and Customer
 * Support. Review links: both may read, Administrator edits.
 */
const Referrals = () => {
  const { canManage } = useReferralsAccess();
  const [params, setParams] = useSearchParams();

  const tabs: { key: TabKey; label: string }[] = [
    ...(canManage ? [{ key: "proof" as const, label: "Proof Page" }, { key: "terms" as const, label: "Terms" }] : []),
    { key: "queue", label: "Queue" },
    { key: "reviews", label: "Review links" },
  ];
  const requested = params.get("tab") as TabKey | null;
  const active: TabKey = tabs.some((t) => t.key === requested) ? (requested as TabKey) : tabs[0].key;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-7 w-7" />
            Referrals
          </h1>
          <p className="text-muted-foreground mt-1">
            Owners share a verified record of your work with friends. You see who asked to be contacted.
          </p>
        </div>

        <Tabs value={active} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="flex-wrap h-auto">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {canManage && (
            <TabsContent value="proof" className="mt-6">
              <ProofPageTab />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="terms" className="mt-6">
              <TermsTab canEdit={canManage} />
            </TabsContent>
          )}
          <TabsContent value="queue" className="mt-6">
            <QueueTab />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <ReviewLinksTab canEdit={canManage} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Referrals;
