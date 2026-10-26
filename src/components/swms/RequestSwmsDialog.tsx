import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { swmsErrorMessage, useCreateSwmsRequestMutation } from "@/store/api/builderSwms";

/** Picker value for "a trade not listed — enter their email". */
const BY_EMAIL = "__email__";

const schema = z
  .object({
    tradeOrgId: z.string(),
    email: z.string().trim().optional(),
    tradeName: z.string().trim().max(200).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.tradeOrgId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tradeOrgId"], message: "Choose a trade or enter their email." });
    }
    if (v.tradeOrgId === BY_EMAIL) {
      if (!v.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Enter the trade's email." });
      } else if (!z.string().email().safeParse(v.email).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Enter a valid email." });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export interface RequestSwmsTradeOption {
  tradeOrgId: string;
  tradeName: string;
}

interface RequestSwmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  trades: RequestSwmsTradeOption[];
  /** Pre-select a trade (row action). */
  initialTradeOrgId?: string | null;
}

export function RequestSwmsDialog({ open, onOpenChange, projectId, trades, initialTradeOrgId }: RequestSwmsDialogProps) {
  const { toast } = useToast();
  const [createRequest, { isLoading }] = useCreateSwmsRequestMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tradeOrgId: "", email: "", tradeName: "", note: "" },
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      reset({
        tradeOrgId: initialTradeOrgId ?? (trades.length === 0 ? BY_EMAIL : ""),
        email: "",
        tradeName: "",
        note: "",
      });
    }
  }, [open, initialTradeOrgId, trades.length, reset]);

  const tradeOrgId = watch("tradeOrgId");
  const byEmail = tradeOrgId === BY_EMAIL;

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    try {
      await createRequest({
        projectId,
        body: byEmail
          ? { email: v.email || undefined, tradeName: v.tradeName || undefined, note: v.note || undefined }
          : { tradeOrgId: v.tradeOrgId, note: v.note || undefined },
      }).unwrap();
      const name = byEmail ? v.tradeName || v.email : trades.find((t) => t.tradeOrgId === v.tradeOrgId)?.tradeName;
      toast({ title: "SWMS requested", description: name ? `We've asked ${name} for a SWMS.` : undefined });
      onOpenChange(false);
    } catch (err) {
      setServerError(swmsErrorMessage(err, "Could not send the request."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a SWMS</DialogTitle>
          <DialogDescription>
            The trade is emailed a request for a Safe Work Method Statement for this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Trade</Label>
            <Select value={tradeOrgId} onValueChange={(val) => setValue("tradeOrgId", val, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a trade on this project" />
              </SelectTrigger>
              <SelectContent>
                {trades.map((t) => (
                  <SelectItem key={t.tradeOrgId} value={t.tradeOrgId}>
                    {t.tradeName}
                  </SelectItem>
                ))}
                <SelectItem value={BY_EMAIL}>Someone else (enter email)</SelectItem>
              </SelectContent>
            </Select>
            {errors.tradeOrgId && <p className="text-xs text-destructive">{errors.tradeOrgId.message}</p>}
          </div>

          {byEmail && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="swms-req-email">Email</Label>
                <Input id="swms-req-email" type="email" placeholder="trade@example.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="swms-req-name">Trade name (optional)</Label>
                <Input id="swms-req-name" placeholder="e.g. Smith Electrical" {...register("tradeName")} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="swms-req-note">Note (optional)</Label>
            <Textarea id="swms-req-note" rows={3} placeholder="Scope, start date, site rules…" {...register("note")} />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
