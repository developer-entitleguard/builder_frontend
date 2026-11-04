import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  completionErrorMessage,
  completionErrorStatus,
  useDraftChaseTemplateMutation,
  useGetChaseTemplateQuery,
  useSaveChaseTemplateMutation,
} from "@/store/api/completion";

const MAX = 2000;
const REQUIRED = ["{items}", "{builder}"] as const;
const PLACEHOLDERS: { token: string; meaning: string; required: boolean }[] = [
  { token: "{items}", meaning: "the documents still needed", required: true },
  { token: "{builder}", meaning: "your business name", required: true },
  { token: "{recipient}", meaning: "the trade's name", required: false },
  { token: "{count}", meaning: "how many times they have been asked", required: false },
];

/** Project Manager and Administrator: the wording of the automatic document requests. */
export const ChaseWordingEditor = () => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetChaseTemplateQuery();
  const [save, { isLoading: saving }] = useSaveChaseTemplateMutation();
  const [draft, { isLoading: drafting }] = useDraftChaseTemplateMutation();
  const [text, setText] = useState("");
  const [aiOff, setAiOff] = useState<string | null>(null);

  useEffect(() => {
    if (data?.template != null) setText(data.template);
  }, [data?.template]);

  const missing = REQUIRED.filter((p) => !text.includes(p));
  const tooLong = text.length > MAX;
  const dirty = text !== (data?.template ?? "");

  const onSave = async () => {
    try {
      await save({ template: text }).unwrap();
      toast({ title: "Wording saved" });
    } catch (e) {
      toast({ title: "Couldn't save the wording", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  const onDraft = async () => {
    try {
      const res = await draft().unwrap();
      setText(res.template);
      toast({ title: "Draft ready", description: "Check it, edit it, then save." });
    } catch (e) {
      if (completionErrorStatus(e) === 409) {
        setAiOff(completionErrorMessage(e, "AI drafting is not switched on yet"));
        return;
      }
      toast({ title: "Couldn't draft wording", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document request wording</CardTitle>
        <CardDescription>
          The message trades receive when a document is still needed. It is sent automatically and when you
          press "Send request now".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : error ? (
          <p className="text-sm text-destructive">{completionErrorMessage(error, "Could not load the wording.")}</p>
        ) : (
          <>
            <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {PLACEHOLDERS.map((p) => (
                <li key={p.token}>
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">{p.token}</code> {p.meaning}
                  {p.required ? " (must stay)" : ""}
                </li>
              ))}
            </ul>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={tooLong ? "text-destructive" : "text-muted-foreground"}>
                {text.length} / {MAX} characters
              </span>
              {missing.length > 0 && (
                <span className="text-destructive">The wording must keep {missing.join(" and ")}.</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSave} disabled={saving || !dirty || missing.length > 0 || tooLong}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save wording
              </Button>
              <Button variant="outline" onClick={onDraft} disabled={drafting || !!aiOff}>
                {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Draft with AI
              </Button>
            </div>
            {aiOff && <p className="text-xs text-muted-foreground">{aiOff}. You can still edit the wording yourself.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChaseWordingEditor;
