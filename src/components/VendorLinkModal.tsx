import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { useLazyGetVendorLinkQuery } from "@/store/api";

interface VendorLinkModalProps {
  open: boolean;
  onClose: () => void;
  queryId: string;
}

const VendorLinkModal = ({ open, onClose, queryId }: VendorLinkModalProps) => {
  const [copied, setCopied] = useState(false);
  const [triggerGetLink, { data, isLoading, error }] =
    useLazyGetVendorLinkQuery();

  useEffect(() => {
    if (open && queryId) {
      triggerGetLink({ queryId });
      setCopied(false);
    }
  }, [open, queryId, triggerGetLink]);

  const vendorLink = data?.data?.link ?? "";
  const vendorName = data?.data?.vendorName ?? "";
  const vendorContact = data?.data?.vendorContact ?? "";

  const handleCopy = async () => {
    if (!vendorLink) return;
    try {
      await navigator.clipboard.writeText(vendorLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = vendorLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vendor Link</DialogTitle>
          <DialogDescription>
            Share this link with the vendor so they can view and update the
            query without logging in.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Generating link...
            </span>
          </div>
        ) : error || !data?.success ? (
          <div className="py-4 text-center text-destructive">
            {data?.message || "Failed to generate vendor link. Please ensure a vendor is assigned."}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Vendor Name
                </Label>
                <p className="font-medium">{vendorName || "-"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Vendor Contact
                </Label>
                <p className="font-medium">{vendorContact || "-"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Vendor Link
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={vendorLink}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600">
                  Copied to clipboard!
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              This link is valid for 7 days. The vendor can view query details,
              add comments, and update the status.
            </p>
          </div>
        )}

        <DialogFooter>
          {vendorLink && (
            <Button
              variant="outline"
              onClick={() => window.open(vendorLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link
            </Button>
          )}
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorLinkModal;
