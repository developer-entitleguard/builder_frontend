import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AnnouncementView } from "@/store/api/clientAnnouncements";

/**
 * A blocking acknowledge dialog for a MODAL announcement. When
 * {@code requiresAck} is set the dialog cannot be dismissed by the close button,
 * Esc, or an outside click — only the Acknowledge action closes it (which records
 * the ack server-side).
 */
export function AnnouncementModal({
  a,
  onAcknowledge,
}: {
  a: AnnouncementView;
  onAcknowledge: () => void;
}) {
  const mandatory = !!a.requiresAck;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Ignore close attempts for mandatory modals; a non-mandatory one
        // dismisses like an ack.
        if (!open && !mandatory) onAcknowledge();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => mandatory && e.preventDefault()}
        onInteractOutside={(e) => mandatory && e.preventDefault()}
        onPointerDownOutside={(e) => mandatory && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{a.title || "Notice"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{a.message}</p>
        {a.linkUrl && (
          <a
            href={a.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline underline-offset-2"
          >
            {a.linkLabel || "Learn more"}
          </a>
        )}
        <DialogFooter>
          <Button onClick={onAcknowledge}>{mandatory ? "Acknowledge" : "Got it"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
