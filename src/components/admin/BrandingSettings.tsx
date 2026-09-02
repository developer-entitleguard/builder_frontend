import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  useGetBuilderBrandingQuery,
  useUploadBuilderLogoMutation,
  useRemoveBuilderLogoMutation,
  useUpdateHandoverMessageMutation,
  usePreviewHandoverEmailMutation,
} from "@/store/api/builderBranding";
import {
  DEFAULT_LOGO_LIMITS,
  LOGO_ACCEPT,
  logoErrorMessage,
  logoRulesText,
  validateLogoFile,
} from "@/lib/logoValidation";
import { cn } from "@/lib/utils";
import { AlertCircle, Eye, ImageIcon, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";

/**
 * EngineeringPlan_Builder_Branding_And_Handover_Email §5.1. Admin → Branding &
 * Handover: the org logo (shown in the portal header and at the top of every
 * customer email) and the builder-authored message block in the handover email.
 */

const plainText = (html: string): string =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

interface BrandingSettingsProps {
  organizationName?: string;
}

export function BrandingSettings({ organizationName }: BrandingSettingsProps) {
  const { data, isLoading, isError, refetch } = useGetBuilderBrandingQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Could not load branding settings.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <LogoCard
        logoUrl={data.logoUrl}
        limits={data.limits}
        organizationName={organizationName}
      />
      <HandoverMessageCard
        organizationName={organizationName}
        savedHtml={data.handoverMessageHtml}
        isDefault={data.isDefaultHandoverMessage}
        defaultHtml={data.defaultHandoverMessageHtml}
        maxChars={data.limits.messageMaxChars}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

interface LogoCardProps {
  logoUrl: string | null;
  limits: typeof DEFAULT_LOGO_LIMITS & { messageMaxChars: number };
  organizationName?: string;
}

function LogoCard({ logoUrl, limits, organizationName }: LogoCardProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [upload, { isLoading: uploading }] = useUploadBuilderLogoMutation();
  const [remove, { isLoading: removing }] = useRemoveBuilderLogoMutation();

  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selected]);

  const clearSelection = () => {
    setSelected(null);
    setClientError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setClientError(null);
    if (!file) {
      setSelected(null);
      return;
    }
    const problem = await validateLogoFile(file, limits);
    if (problem) {
      setClientError(problem);
      setSelected(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSelected(file);
  };

  const onUpload = async () => {
    if (!selected) return;
    try {
      await upload(selected).unwrap();
      toast({ title: "Logo updated", description: "Your logo now appears in the portal and on customer emails." });
      clearSelection();
    } catch (err) {
      setClientError(logoErrorMessage(err));
    }
  };

  const onRemove = async () => {
    setConfirmRemove(false);
    try {
      await remove().unwrap();
      toast({ title: "Logo removed", description: "Emails will show your organisation name instead." });
    } catch {
      toast({ title: "Could not remove logo", variant: "destructive" });
    }
  };

  const shownUrl = previewUrl ?? logoUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Organisation logo
        </CardTitle>
        <CardDescription>
          Shown in the portal header and at the top of every email we send to your customers. When there is no
          logo, your organisation name is shown instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <LogoSwatch label="On light" dark={false} url={shownUrl} name={organizationName} />
          <LogoSwatch label="On dark" dark url={shownUrl} name={organizationName} />
        </div>

        <p className="text-sm text-muted-foreground">{logoRulesText(limits)}</p>

        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ACCEPT}
          onChange={onPick}
          className="hidden"
          data-testid="logo-file-input"
        />

        {clientError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{clientError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!selected ? (
            <>
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading || removing}>
                <Upload className="mr-2 h-4 w-4" />
                {logoUrl ? "Choose a new logo" : "Choose logo"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={uploading || removing}>
                  {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Remove
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="text-sm truncate max-w-[240px]" title={selected.name}>
                {selected.name}
              </span>
              <Button type="button" onClick={onUpload} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              <Button type="button" variant="ghost" onClick={clearSelection} disabled={uploading}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove logo?</AlertDialogTitle>
            <AlertDialogDescription>
              Customer emails and the portal header will show your organisation name instead. You can upload a new
              logo at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep logo</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function LogoSwatch({ label, dark, url, name }: { label: string; dark: boolean; url: string | null; name?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]",
        dark ? "bg-slate-900 border-slate-800" : "bg-white",
      )}
    >
      {url ? (
        <img src={url} alt={name ? `${name} logo` : "Organisation logo"} className="max-h-12 max-w-[220px] object-contain" />
      ) : (
        <span className={cn("text-lg font-bold", dark ? "text-white" : "text-slate-900")}>{name || "Your organisation"}</span>
      )}
      <span className={cn("text-xs", dark ? "text-slate-400" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Handover message
// ---------------------------------------------------------------------------

interface HandoverMessageCardProps {
  organizationName?: string;
  savedHtml: string;
  isDefault: boolean;
  defaultHtml: string;
  maxChars: number;
}

function HandoverMessageCard({ organizationName, savedHtml, isDefault, defaultHtml, maxChars }: HandoverMessageCardProps) {
  const { toast } = useToast();
  // Editing the default in place is the natural way to start a custom message.
  const [html, setHtml] = useState<string>(savedHtml);
  const [usingDefault, setUsingDefault] = useState<boolean>(isDefault);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [save, { isLoading: saving }] = useUpdateHandoverMessageMutation();
  const [preview, { isLoading: previewing }] = usePreviewHandoverEmailMutation();

  useEffect(() => {
    setHtml(savedHtml);
    setUsingDefault(isDefault);
  }, [savedHtml, isDefault]);

  const plain = useMemo(() => plainText(html), [html]);
  const count = plain.length;
  const overLimit = count > maxChars;
  const isEmpty = count === 0;
  const dirty = html !== savedHtml || usingDefault !== isDefault;

  const onChange = (next: string) => {
    setHtml(next);
    setUsingDefault(false);
  };

  const resetToDefault = () => {
    setHtml(defaultHtml);
    setUsingDefault(true);
  };

  const onSave = async () => {
    try {
      // Saving the default (or nothing) clears the custom message on the server.
      await save({ html: usingDefault ? "" : html }).unwrap();
      toast({
        title: usingDefault ? "Default message restored" : "Handover message saved",
        description: "New handover emails will use this message.",
      });
    } catch (err) {
      const e = err as { data?: { message?: string; error?: string } };
      toast({
        title: "Could not save message",
        description: e?.data?.message || e?.data?.error || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const onPreview = async () => {
    try {
      const res = await preview({ html: usingDefault ? null : html }).unwrap();
      setPreviewHtml(res.html);
      setPreviewSubject(res.subject);
      setPreviewOpen(true);
    } catch {
      toast({ title: "Could not build preview", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Handover email message</CardTitle>
        <CardDescription>
          This block appears in the middle of the handover email your customers receive, headed
          {" "}
          <span className="font-medium text-foreground">A message from {organizationName || "your organisation"}</span>.
          Write it in your own voice. Bold, italic, lists and links are supported.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usingDefault && (
          <Alert>
            <AlertDescription>
              You are using the EntitleGuard default message. Edit the text below to make it your own.
            </AlertDescription>
          </Alert>
        )}

        <RichTextEditor
          value={html}
          onChange={onChange}
          variant="minimal"
          disabled={saving}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-xs", overLimit ? "text-destructive font-medium" : "text-muted-foreground")}>
            {count.toLocaleString()} / {maxChars.toLocaleString()} characters
            {overLimit && " — too long"}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={resetToDefault} disabled={saving || usingDefault}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to default
            </Button>
            <Button type="button" variant="outline" onClick={onPreview} disabled={previewing || overLimit}>
              {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Preview email
            </Button>
            <Button type="button" onClick={onSave} disabled={saving || overLimit || (isEmpty && !usingDefault) || !dirty}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Handover email preview</DialogTitle>
            <DialogDescription>
              Subject: <span className="font-medium text-foreground">{previewSubject}</span>. Sample customer name and
              your current {dirty ? "unsaved" : "saved"} message.
            </DialogDescription>
          </DialogHeader>
          {/* Sandboxed: the preview is server-rendered HTML and must never run in the app's DOM. */}
          <iframe
            title="Handover email preview"
            sandbox=""
            srcDoc={previewHtml}
            className="w-full h-[70vh] rounded-md border bg-white"
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
