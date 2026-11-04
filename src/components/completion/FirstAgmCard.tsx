import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  completionErrorMessage,
  completionErrorStatus,
  useSetUpFirstAgmMutation,
  type FirstAgmResult,
} from "@/store/api/completion";
import { fmtDay } from "./completionCopy";

/** Strata projects: set up the first AGM document list (Project Manager, Administrator). */
export const FirstAgmCard = ({ projectId }: { projectId: string }) => {
  const { toast } = useToast();
  const [setUp, { isLoading }] = useSetUpFirstAgmMutation();
  const [date, setDate] = useState("");
  const [multiStorey, setMultiStorey] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [result, setResult] = useState<FirstAgmResult | null>(null);

  const onSubmit = async () => {
    setBlocked(null);
    try {
      const r = await setUp({ projectId, plannedAgmDate: date, multiStorey }).unwrap();
      setResult(r);
      toast({ title: "First AGM documents set up", description: `${r.added.length} added` });
    } catch (e) {
      if (completionErrorStatus(e) === 409) {
        setBlocked(completionErrorMessage(e));
        return;
      }
      toast({ title: "Couldn't set up the first AGM", description: completionErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>First AGM</CardTitle>
        <CardDescription>
          Add the documents the owners corporation needs at its first annual general meeting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="agm-date">Planned AGM date</Label>
            <Input id="agm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox id="agm-multi" checked={multiStorey} onCheckedChange={(v) => setMultiStorey(v === true)} />
            <Label htmlFor="agm-multi">Multi-storey building</Label>
          </div>
          <Button onClick={onSubmit} disabled={isLoading || !date}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Set up
          </Button>
        </div>
        {blocked && (
          <Alert>
            <AlertDescription>{blocked}</AlertDescription>
          </Alert>
        )}
        {result && (
          <p className="text-sm text-muted-foreground">
            {result.added.length} document{result.added.length === 1 ? "" : "s"} added
            {result.alreadyPresent.length > 0 ? `, ${result.alreadyPresent.length} already on the list` : ""}.
            {result.itemsDue ? ` Due by ${fmtDay(result.itemsDue)}.` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FirstAgmCard;
