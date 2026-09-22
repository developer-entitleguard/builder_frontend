import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Globe, Smartphone } from "lucide-react";
import {
  BUSINESS_APP_STORE_URL,
  BUSINESS_PLAY_STORE_URL,
  BUSINESS_PORTAL_URL,
} from "@/lib/commercialBusiness";

/**
 * Where the businesses you hand over to access their records — the Business web
 * portal and the EntitleGuard for Business mobile apps. Shown wherever a builder
 * works with commercial handovers so the links are easy to pass on; the
 * commercial handover email carries the same three links.
 */
export function BusinessAppLinks() {
  const link = "inline-flex items-center gap-1.5 text-sm text-primary hover:underline";
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Smartphone className="h-4 w-4" /> Your businesses access their records via:
        </span>
        <a className={link} href={BUSINESS_PORTAL_URL} target="_blank" rel="noreferrer">
          <Globe className="h-3.5 w-3.5" /> Business web portal <ExternalLink className="h-3 w-3" />
        </a>
        <a className={link} href={BUSINESS_APP_STORE_URL} target="_blank" rel="noreferrer">
          App Store <ExternalLink className="h-3 w-3" />
        </a>
        <a className={link} href={BUSINESS_PLAY_STORE_URL} target="_blank" rel="noreferrer">
          Google Play <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
