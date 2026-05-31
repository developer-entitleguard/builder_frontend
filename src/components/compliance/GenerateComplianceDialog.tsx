import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GenerateComplianceResponse } from "@/store/api/complianceDocuments";

interface GenerateComplianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onGenerate: (prompt?: string) => Promise<GenerateComplianceResponse>;
  onSuccess?: () => void;
}

const GENERIC_ERROR =
  "We couldn't generate the compliance document list right now. Please try again in a moment.";

type Feedback = { type: "guidance" | "error"; message: string };

export const GenerateComplianceDialog = ({
  open,
  onOpenChange,
  isLoading,
  onGenerate,
  onSuccess,
}: GenerateComplianceDialogProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const reset = () => {
    setPrompt("");
    setFeedback(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (isLoading) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    setFeedback(null);
    const trimmed = prompt.trim();
    try {
      const result = await onGenerate(trimmed || undefined);
      if (!result?.success) {
        const reason =
          result?.data && !Array.isArray(result.data) ? result.data.reason : undefined;
        if (reason === "INSUFFICIENT_INPUT") {
          setFeedback({ type: "guidance", message: result.message || GENERIC_ERROR });
        } else {
          setFeedback({ type: "error", message: result?.message || GENERIC_ERROR });
        }
        return;
      }
      const count = Array.isArray(result.data) ? result.data.length : 0;
      toast({
        title: "Compliance list generated",
        description: result.message || `Added ${count} document line item(s).`,
      });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setFeedback({ type: "error", message: GENERIC_ERROR });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate compliance list
          </DialogTitle>
          <DialogDescription>
            Drafts the required NSW compliance documents for this property
            using its type, location and BAL rating. Add any extra context below
            (optional).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {feedback && (
            <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
              {feedback.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertTitle>
                {feedback.type === "error"
                  ? "Couldn't generate list"
                  : "Add a bit more detail"}
              </AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {feedback.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="generate-compliance-prompt">
              Additional context (optional)
            </Label>
            <Textarea
              id="generate-compliance-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (feedback) setFeedback(null);
              }}
              placeholder="e.g. Bushfire-prone land, on-site wastewater system, swimming pool requiring a compliance certificate."
              rows={5}
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate list
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
