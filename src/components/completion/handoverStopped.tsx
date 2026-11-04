import { ToastAction } from "@/components/ui/toast";
import { completionTabPath, isHandoverStopped } from "./completionCopy";

/**
 * Completion Gate: the existing handover action now fails with "Handover
 * stopped: N required item(s) still open (...)". Returns the toast for that
 * failure, with a button to the project's Completion tab when the home has a
 * project. Returns null for any other message so callers keep their own copy.
 *
 * The Toaster sits outside the router, so the button navigates through the
 * caller's `navigate` rather than a <Link>.
 */
export const handoverStoppedToast = (
  message: string | null | undefined,
  projectId: string | null | undefined,
  navigate: (to: string) => void,
) => {
  if (!isHandoverStopped(message)) return null;
  return {
    title: "Handover stopped",
    description: message as string,
    variant: "destructive" as const,
    action: projectId ? (
      <ToastAction altText="Open the Completion tab" onClick={() => navigate(completionTabPath(projectId))}>
        Open Completion
      </ToastAction>
    ) : undefined,
  };
};
