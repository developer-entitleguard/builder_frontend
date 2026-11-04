import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { referralsErrorMessage, useGetReviewLinksQuery, useSetReviewLinksMutation } from "@/store/api/referrals";
import { REVIEW_REQUESTS_NOTE, reviewUrlError } from "./referralsCopy";

/**
 * Review links (VR14). Where review requests send customers. There is no send
 * button anywhere: requests go out on events alone, to every customer.
 */
export const ReviewLinksTab = ({ canEdit }: { canEdit: boolean }) => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetReviewLinksQuery();
  const [save, { isLoading: saving }] = useSetReviewLinksMutation();
  const [google, setGoogle] = useState("");
  const [productReview, setProductReview] = useState("");

  useEffect(() => {
    setGoogle(data?.googleUrl ?? "");
    setProductReview(data?.productReviewUrl ?? "");
  }, [data]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) {
    return <p className="text-sm text-destructive">{referralsErrorMessage(error, "Could not load the review links")}</p>;
  }

  const googleError = reviewUrlError(google, "google");
  const productReviewError = reviewUrlError(productReview, "productReview");

  const onSave = async () => {
    if (googleError || productReviewError) return;
    try {
      await save({ googleUrl: google.trim() || null, productReviewUrl: productReview.trim() || null }).unwrap();
      toast({ title: "Review links saved" });
    } catch (e) {
      toast({ title: "Could not save the review links", description: referralsErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review links</CardTitle>
        <CardDescription>{REVIEW_REQUESTS_NOTE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="rl-google">Google review link</Label>
          <Input
            id="rl-google"
            type="url"
            placeholder="https://g.page/r/…"
            value={google}
            readOnly={!canEdit}
            onChange={(e) => setGoogle(e.target.value)}
          />
          {canEdit && googleError && <p className="text-xs text-destructive">{googleError}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="rl-pr">ProductReview link</Label>
          <Input
            id="rl-pr"
            type="url"
            placeholder="https://www.productreview.com.au/listings/…"
            value={productReview}
            readOnly={!canEdit}
            onChange={(e) => setProductReview(e.target.value)}
          />
          {canEdit && productReviewError && <p className="text-xs text-destructive">{productReviewError}</p>}
        </div>
        {canEdit ? (
          <Button onClick={onSave} disabled={saving || !!googleError || !!productReviewError}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save links
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Only an Administrator can change these links.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewLinksTab;
