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
  fetchLogoPreview,
  type LogoPreviewKind,
} from "@/store/api/builderBranding";
import {
  DEFAULT_LOGO_LIMITS,
  LOGO_ACCEPT,
  logoErrorMessage,
  logoRulesText,
  minLongEdge,
  validateLogoFile,
} from "@/lib/logoValidation";
import { viewPhotoUrl } from "@/lib/api/services/files";
import { useEntitlements } from "@/hooks/useEntitlements";
import type { HandoverEmailSegment } from "@/lib/api/types";
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
  const { segments } = useEntitlements();

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
        logoFileId={data.logoFileId}
        limits={data.limits}
        organizationName={organizationName}
      />
      <HandoverMessageCard
        segment="RESIDENTIAL"
        title={segments.commercial ? "Residential handover email message" : "Handover email message"}
        recipientNote="the handover email your homeowner customers receive"
        organizationName={organizationName}
        savedHtml={data.handoverMessageHtml}
        isDefault={data.isDefaultHandoverMessage}
        defaultHtml={data.defaultHandoverMessageHtml}
        maxChars={data.limits.messageMaxChars}
      />
      {segments.commercial && (
        <HandoverMessageCard
          segment="COMMERCIAL"
          title="Commercial handover email message"
          recipientNote="the commercial handover email the business you hand over to receives (it links them to the Business portal, not the consumer app)"
          organizationName={organizationName}
          savedHtml={data.commercialHandoverMessageHtml}
          isDefault={data.isDefaultCommercialHandoverMessage}
          defaultHtml={data.defaultCommercialHandoverMessageHtml}
          maxChars={data.limits.messageMaxChars}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

interface LogoCardProps {
  logoFileId: string | null;
  limits: typeof DEFAULT_LOGO_LIMITS & { messageMaxChars: number };
  organizationName?: string;
}

function LogoCard({ logoFileId, limits, organizationName }: LogoCardProps) {
  // Render via the same-origin file URL (Vite proxy in dev, SPA /api routing in
  // prod) — NOT the DTO's absolute logoUrl, which is built for email clients
  // from app.api.public-base-url and breaks wherever that isn't configured.
  const logoUrl = logoFileId ? viewPhotoUrl(logoFileId) : null;
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

        <LowResolutionHint url={selected ? null : logoUrl} minEdge={minLongEdge(limits)} />

        <p className="text-sm text-muted-foreground">{logoRulesText(limits)}</p>

        <DocumentHeaderPreviews file={selected} savedLogoFileId={logoFileId} />

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

/**
 * PRD BR5: the saved logo is small enough to look soft on printed documents.
 * The server stores a normalised copy that fits 600 × 200, so a logo that was
 * scaled down to fit (height at the 200 px cap) is not flagged — only one whose
 * stored size is its source size and still under the long-edge floor.
 */
function LowResolutionHint({ url, minEdge }: { url: string | null; minEdge: number }) {
  const [low, setLow] = useState(false);
  useEffect(() => {
    setLow(false);
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setLow(w > 0 && Math.max(w, h) < minEdge && h < 200);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, minEdge]);
  if (!low) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-amber-700" data-testid="logo-low-res-hint">
      <AlertCircle className="h-3.5 w-3.5" />
      Low resolution: your saved logo is under {minEdge} px on its long edge and may look blurry on quotes and SWMS.
      Upload a larger PNG/JPEG or an SVG.
    </p>
  );
}

const PREVIEW_KINDS: { kind: LogoPreviewKind; label: string }[] = [
  { kind: "QUOTE", label: "Quote header" },
  { kind: "SWMS", label: "SWMS header" },
];

/**
 * PRD BR5: server-rendered document-header previews. Uses the picked file
 * before it is saved, else the saved logo; refreshes when either changes.
 */
function DocumentHeaderPreviews({ file, savedLogoFileId }: { file: File | null; savedLogoFileId: string | null }) {
  const [urls, setUrls] = useState<Partial<Record<LogoPreviewKind, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<LogoPreviewKind, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    setLoading(true);
    setErrors({});
    Promise.allSettled(PREVIEW_KINDS.map(({ kind }) => fetchLogoPreview(kind, file))).then((results) => {
      if (cancelled) return;
      const nextUrls: Partial<Record<LogoPreviewKind, string>> = {};
      const nextErrors: Partial<Record<LogoPreviewKind, string>> = {};
      results.forEach((r, i) => {
        const kind = PREVIEW_KINDS[i].kind;
        if (r.status === "fulfilled") {
          const u = URL.createObjectURL(r.value);
          created.push(u);
          nextUrls[kind] = u;
        } else {
          nextErrors[kind] = r.reason instanceof Error ? r.reason.message : "Preview unavailable.";
        }
      });
      setUrls(nextUrls);
      setErrors(nextErrors);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [file, savedLogoFileId]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">
        Document header preview{file ? " (unsaved logo)" : ""}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PREVIEW_KINDS.map(({ kind, label }) => (
          <div key={kind} className="rounded-md border bg-white p-2">
            <div className="flex min-h-[90px] items-center justify-center">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : urls[kind] ? (
                <img src={urls[kind]} alt={`${label} preview`} className="w-full object-contain" />
              ) : (
                <span className="text-xs text-destructive">{errors[kind] ?? "Preview unavailable."}</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </div>
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
  segment: HandoverEmailSegment;
  title: string;
  /** Completes "This block appears in the middle of …". */
  recipientNote: string;
  organizationName?: string;
  savedHtml: string;
  isDefault: boolean;
  defaultHtml: string;
  maxChars: number;
}

function HandoverMessageCard({ segment, title, recipientNote, organizationName, savedHtml, isDefault, defaultHtml, maxChars }: HandoverMessageCardProps) {
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
      await save({ html: usingDefault ? "" : html, segment }).unwrap();
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
      const res = await preview({ html: usingDefault ? null : html, segment }).unwrap();
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          This block appears in the middle of {recipientNote}, in a highlighted box.
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
