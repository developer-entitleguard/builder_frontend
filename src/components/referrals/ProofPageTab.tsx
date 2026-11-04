import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getConsumerWebUrl } from "@/lib/config";
import {
  referralsErrorMessage,
  useGetProofPageQuery,
  usePublishProofPageMutation,
  useUnpublishProofPageMutation,
} from "@/store/api/referrals";
import { METHOD_LINE, NOT_ENOUGH_RECORDS, fmtDate, fmtRange } from "./referralsCopy";

/**
 * Proof Page (VR1 to VR3). A preview of the measures as the public will see
 * them, and one switch for the whole page. There is deliberately no control
 * per measure (VR2): a measure shows once enough homes stand behind it.
 */
export const ProofPageTab = () => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetProofPageQuery();
  const [publish, { isLoading: publishing }] = usePublishProofPageMutation();
  const [unpublish, { isLoading: unpublishing }] = useUnpublishProofPageMutation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{referralsErrorMessage(error, "Could not load the Proof Page")}</p>;
  }

  const { page, measures, publicPath } = data;
  const published = !!page?.published;
  const publicUrl = publicPath ? `${getConsumerWebUrl()}${publicPath}` : null;

  const onPublish = async () => {
    try {
      await publish().unwrap();
      toast({ title: "Proof Page published" });
    } catch (e) {
      // 409 says how many homes are on record, or that Entitle Guard unpublished it.
      toast({ title: "Could not publish", description: referralsErrorMessage(e), variant: "destructive" });
    }
  };

  const onUnpublish = async () => {
    try {
      await unpublish().unwrap();
      toast({ title: "Proof Page unpublished" });
    } catch (e) {
      toast({ title: "Could not unpublish", description: referralsErrorMessage(e), variant: "destructive" });
    }
  };

  const onCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy the link", description: publicUrl, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Your Proof Page
            <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Not published"}</Badge>
          </CardTitle>
          <CardDescription>
            A public page of measures taken from your records of completed work. It goes on or off as a whole.
            {" "}
            {measures.homesOnRecord} {measures.homesOnRecord === 1 ? "home" : "homes"} on record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {page && !published && page.unpublishedAt && (
            <p className="text-sm text-muted-foreground">
              Unpublished {fmtDate(page.unpublishedAt)}
              {page.unpublishReason ? `: ${page.unpublishReason}` : "."}
            </p>
          )}
          {published && page?.publishedAt && (
            <p className="text-sm text-muted-foreground">Published {fmtDate(page.publishedAt)}.</p>
          )}
          {!measures.publishable && !published && (
            <p className="text-sm text-muted-foreground">
              A Proof Page needs at least 10 homes on record before it can be published.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {published ? (
              <Button variant="outline" onClick={onUnpublish} disabled={unpublishing}>
                {unpublishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Unpublish
              </Button>
            ) : (
              <Button onClick={onPublish} disabled={publishing}>
                {publishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publish
              </Button>
            )}
          </div>

          {published && publicUrl && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Public link</p>
              <div className="flex gap-2">
                <Input readOnly value={publicUrl} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" onClick={onCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Open the public page">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Measures</CardTitle>
          <CardDescription>
            What the public page shows.
            {measures.computedAt ? ` Figures as of ${fmtDate(measures.computedAt)}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {measures.measures.length === 0 ? (
            <p className="text-sm text-muted-foreground">{NOT_ENOUGH_RECORDS}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {measures.measures.map((m) => (
                <div key={m.key} className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  {m.shown && m.value != null ? (
                    <>
                      <p className="text-2xl font-semibold">{m.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.homes} {m.homes === 1 ? "home" : "homes"}
                        {fmtRange(m.from, m.to) ? `, ${fmtRange(m.from, m.to)}` : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium mt-1">{m.note || NOT_ENOUGH_RECORDS}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{measures.method || METHOD_LINE}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProofPageTab;
