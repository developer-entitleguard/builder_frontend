import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle2, FileWarning, Building2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

interface ComplianceUploadView {
  documentName: string | null;
  description: string | null;
  projectName: string | null;
  assigneeEmail: string | null;
  status: string | null;
  rejectionReason: string | null;
}

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.heic";

/**
 * Compliance Document Assignment (Phase 4). Public, no-login page for an
 * off-platform assignee to upload a single compliance document. The 30-day
 * magic-link token in the URL is the only credential.
 */
const ComplianceUpload = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ComplianceUploadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setError("This link is missing its token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/unsecure/compliance/document?token=${encodeURIComponent(token)}`
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message || "This link is invalid or has expired.");
      } else {
        setView(body.data as ComplianceUploadView);
      }
    } catch {
      setError("Something went wrong loading this document.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `${getApiBaseUrl()}/unsecure/compliance/document/upload?token=${encodeURIComponent(token)}`,
        { method: "POST", body: form }
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message || "Upload failed. Please try again.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Something went wrong during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Document upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error && !view ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileWarning className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="font-medium">Thank you — your document was received.</p>
              <p className="text-sm text-muted-foreground">
                The builder will review it. You can close this page.
              </p>
            </div>
          ) : (
            view && (
              <>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">You've been asked to provide</p>
                  <p className="text-lg font-semibold">{view.documentName}</p>
                  {view.projectName && (
                    <p className="text-sm text-muted-foreground">for {view.projectName}</p>
                  )}
                </div>
                {view.description && (
                  <p className="text-sm text-muted-foreground">{view.description}</p>
                )}
                {view.status === "SUBMITTED" && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    Awaiting builder review
                  </Badge>
                )}
                {view.rejectionReason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    A previous submission was rejected: {view.rejectionReason}. Please upload a corrected
                    document.
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Choose a file to upload
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Allowed: PDF, PNG, JPG, JPEG, HEIC · max 10 MB
                </p>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
              </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceUpload;
