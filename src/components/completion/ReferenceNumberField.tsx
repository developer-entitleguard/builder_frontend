import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { completionErrorMessage, useSetAttachmentReferenceMutation } from "@/store/api/completion";

/** CG9: the state system's reference (for example a CCEW number) on the item's current document. */
export const ReferenceNumberField = ({
  attachmentId,
  referenceNumber,
}: {
  attachmentId: string;
  referenceNumber: string | null;
}) => {
  const { toast } = useToast();
  const [save, { isLoading }] = useSetAttachmentReferenceMutation();
  const [value, setValue] = useState(referenceNumber ?? "");
  useEffect(() => setValue(referenceNumber ?? ""), [referenceNumber]);
  const dirty = value.trim() !== (referenceNumber ?? "");

  const onSave = async () => {
    try {
      await save({ attachmentId, referenceNumber: value.trim() }).unwrap();
      toast({ title: "Reference saved" });
    } catch (e) {
      toast({ title: "Couldn't save the reference", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="mt-2 flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={120}
        placeholder="State reference (e.g. CCEW number)"
        aria-label="State reference number"
        title="Recorded for your files. Entitle Guard does not lodge anything with the state."
        className="h-8 max-w-[16rem] text-xs"
      />
      {dirty && (
        <Button size="sm" variant="outline" className="h-8" onClick={onSave} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      )}
    </div>
  );
};

export default ReferenceNumberField;
