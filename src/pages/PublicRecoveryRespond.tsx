import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileWarning, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";
import TargetResponsePanel from "@/components/recovery/TargetResponsePanel";
import type { TargetAction, TargetView } from "@/store/api/recovery";

const EXPIRED = "This link has expired or was withdrawn.";

/** Reads `message` from an error body that may not be JSON. */
const messageOf = async (res: Response, fallback: string): Promise<string> => {
  if (res.status === 404) return EXPIRED;
  try {
    const body = await res.json();
    if (body && typeof body.message === "string" && body.message.trim()) return body.message;
  } catch {
    // not JSON
  }
  return fallback;
};

/**
 * Defect Recovery DR9: the public response page for an off-platform recipient.
 * No login and no builder app shell: the token in the URL is the only
 * credential, so this uses plain fetch (no JWT, no sign-in redirect on 401).
 * Photos are listed by name; the downloadable record of events carries them.
 */
const PublicRecoveryRespond = () => {
  const { token = "" } = useParams<{ token: string }>();
  const base = `${getApiBaseUrl()}/unsecure/recovery/${encodeURIComponent(token)}`;
  const [view, setView] = useState<TargetView | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setFatal(EXPIRED);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(base, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        setFatal(await messageOf(res, "Something went wrong loading this notice."));
      } else {
        setView((await res.json()) as TargetView);
      }
    } catch {
      setFatal("Something went wrong loading this notice.");
    } finally {
      setLoading(false);
    }
  }, [base, token]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (path: string, fields: Record<string, string | File | null>, done: string): Promise<boolean> => {
    setMessage(null);
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (v == null || (typeof v === "string" && !v.trim())) return;
      form.append(k, v);
    });
    try {
      const res = await fetch(`${base}/${path}`, { method: "POST", body: form, headers: { Accept: "application/json" } });
      if (!res.ok) {
        const text = await messageOf(res, "Something went wrong. Please try again.");
        if (res.status === 404) {
          setView(null);
          setFatal(text);
        } else {
          setMessage({ text, error: true });
        }
        return false;
      }
      setView((await res.json()) as TargetView);
      setMessage({ text: done, error: false });
      return true;
    } catch {
      setMessage({ text: "Something went wrong. Please try again.", error: true });
      return false;
    }
  };

  const download = async () => {
    setMessage(null);
    try {
      const res = await fetch(`${base}/pack`);
      if (!res.ok) {
        setMessage({ text: await messageOf(res, "Could not download the record of events."), error: true });
        return;
      }
      const blob = await res.blob();
      const m = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/i);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = m?.[1] ?? "record-of-events.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage({ text: "Could not download the record of events.", error: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Notice about a defect</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A builder has sent you this notice through Entitle Guard, with the record of events it relies on.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fatal || !view ? (
          <div className="flex flex-col items-center gap-2 rounded-md border bg-background py-12 text-center">
            <FileWarning className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{fatal || EXPIRED}</p>
          </div>
        ) : (
          <>
            {message && (
              <p
                role={message.error ? "alert" : "status"}
                className={`rounded-md border px-3 py-2 text-sm ${
                  message.error ? "border-destructive/40 text-destructive" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {message.text}
              </p>
            )}
            <TargetResponsePanel
              view={view}
              handlers={{
                respond: (action: TargetAction, note, file) =>
                  post("respond", { action, note, file }, "Your response was sent to the builder."),
                addEvidence: (note, file) => post("evidence", { note, file }, "Your evidence was added."),
                download,
                onError: (text) => setMessage({ text, error: true }),
                fileHref: () => null,
              }}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default PublicRecoveryRespond;
