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
import { useGenerateActivitiesMutation } from "@/store/api/activities";

interface GenerateActivitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

// Minimum characters before we bother the AI — catches empty / trivial input.
const MIN_PROMPT_LENGTH = 15;

const PROMPT_TEMPLATE = `Your project's type, location, BAL rating and any registered floor area are already included — no need to repeat them. Add anything else that shapes the work, for example:
• Scope inclusions/exclusions (e.g. "turnkey finish", "exclude landscaping")
• Special features (pool, deck, garage/carport, lift, secondary dwelling)
• Common areas for multi-dwelling builds (shared lobby/corridors, lifts, basement carpark, fire services)
• Overall built-up area or common-area size, if not already captured
• Finish level and any site constraints

Example: "Double-storey 4-bedroom home with an attached garage and a pool on a sloping block. Premium kitchen and bathroom finishes. Exclude landscaping."`;

const GENERIC_ERROR =
  "We couldn't generate activities right now. Please try again in a moment.";

type Feedback = { type: "guidance" | "error"; message: string };

export const GenerateActivitiesDialog = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: GenerateActivitiesDialogProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generateActivities, { isLoading }] = useGenerateActivitiesMutation();

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
    const trimmed = prompt.trim();

    // Client-side guard: reject obviously empty / too-short input up front.
    if (trimmed.length < MIN_PROMPT_LENGTH) {
      setFeedback({ type: "guidance", message: PROMPT_TEMPLATE });
      return;
    }

    setFeedback(null);

    try {
      const result = await generateActivities({ projectId, prompt: trimmed }).unwrap();

      if (!result?.success) {
        // Only the flagged "insufficient input" case is shown as actionable
        // guidance; anything else is a system error with a generic message.
        const reason =
          result?.data && !Array.isArray(result.data)
            ? result.data.reason
            : undefined;

        if (reason === "INSUFFICIENT_INPUT") {
          setFeedback({ type: "guidance", message: result.message || PROMPT_TEMPLATE });
        } else {
          setFeedback({ type: "error", message: GENERIC_ERROR });
        }
        return;
      }

      const count = Array.isArray(result.data) ? result.data.length : 0;
      toast({
        title: "Activities generated",
        description: result.message || `Added ${count} activities to this project.`,
      });

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Never surface raw/internal error detail to the UI.
      setFeedback({ type: "error", message: GENERIC_ERROR });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate activities with AI
          </DialogTitle>
          <DialogDescription>
            Describe this project and the AI will draft a categorised activity list.
            Your project's type, location, BAL rating and any registered floor area
            are included automatically — just add the extra detail. A clear
            description is required.
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
                  ? "Couldn't generate activities"
                  : "Add a bit more detail"}
              </AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {feedback.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="generate-prompt">Project description</Label>
            <Textarea
              id="generate-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (feedback) setFeedback(null);
              }}
              placeholder="e.g. Double-storey home with a swimming pool and a detached garage. Sloping block needing retaining walls. Premium kitchen and bathroom finishes. Exclude landscaping."
              rows={6}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              No need to repeat the project type, location or floor area. Focus on
              scope inclusions/exclusions, special features (pool, lift, secondary
              dwelling), common areas, finish level and site constraints.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
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
                Generate activities
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
