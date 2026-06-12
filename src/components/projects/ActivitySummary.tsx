import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Activity } from "@/hooks/useActivities";
import type { ActivityCategory } from "@/hooks/useActivityCategories";

/**
 * Read-only progress view for a developer whose project's build is delegated to a
 * separate builder. The developer monitors progress + on-time risk only — they do
 * not work the editable activities page.
 */
export function ActivitySummary({
  activities,
  categories,
  scheduleFeasibility,
  scheduleMessage,
  scheduleRecommendedEndDate,
}: {
  activities: Activity[];
  categories: ActivityCategory[];
  scheduleFeasibility?: string | null;
  scheduleMessage?: string | null;
  scheduleRecommendedEndDate?: string | null;
}) {
  const total = activities.length;
  const done = activities.filter((a) => a.completed || a.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const risk = (scheduleFeasibility ?? "").toUpperCase();
  const showRisk = risk === "AT_RISK" || risk === "NOT_FEASIBLE";

  // Per-category counts (fall back to counting from activities if the category
  // rollups aren't populated).
  const catRows = categories.map((c) => {
    const inCat = activities.filter((a) => a.category_id === c.id);
    const t = c.total_activities ?? inCat.length;
    const d =
      c.completed_activities ??
      inCat.filter((a) => a.completed || a.status === "done").length;
    return { id: c.id, name: c.name, total: t, done: d };
  });

  return (
    <div className="space-y-6">
      {showRisk && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            risk === "NOT_FEASIBLE"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-400/50 bg-amber-50 text-amber-800"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {risk === "NOT_FEASIBLE"
                ? "Target completion date is not achievable"
                : "Completing on time is at risk"}
            </p>
            <p className="mt-0.5">
              {scheduleMessage ||
                "Based on the scheduled activities, the project may not finish by the target end date."}
            </p>
            {scheduleRecommendedEndDate && (
              <p className="mt-0.5">
                Realistic completion: <span className="font-medium">{scheduleRecommendedEndDate}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5" />
            Build progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall</span>
            <span className="font-medium">
              {done} of {total} activities complete
            </span>
          </div>
          <Progress value={pct} />
          <p className="text-right text-xs text-muted-foreground">{pct}%</p>
        </CardContent>
      </Card>

      {catRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {catRows.map((c) => {
              const cp = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.done}/{c.total}
                    </span>
                  </div>
                  <Progress value={cp} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        The build is being delivered by your delegated builder. You can monitor progress here;
        the builder manages the activity details.
      </p>
    </div>
  );
}
