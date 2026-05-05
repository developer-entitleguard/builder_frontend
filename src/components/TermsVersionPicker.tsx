import { ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  useListOrgTermsVersionsQuery,
  type OrgTermsVersionDto,
} from "@/store/api";

/**
 * Per PRD_Org_Terms_And_Conditions §FR-4.1 / §FR-4.2 / §10.2. Card-shaped
 * picker rendered on the registration detail page. Locked once the
 * registration is handed over (snapshot has migrated to the Order at that
 * point and cannot retroactively change).
 */
export interface TermsVersionPickerProps {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  locked?: boolean;
  lockedReason?: string;
  disabled?: boolean;
}

export function TermsVersionPicker({
  value,
  onChange,
  locked,
  lockedReason,
  disabled,
}: TermsVersionPickerProps) {
  const { data: versions = [], isLoading } = useListOrgTermsVersionsQuery();

  const activeVersions = versions.filter((v) => !v.isArchived);
  const assignedVersion = versions.find((v) => v.id === value);
  const orgHasDefault = activeVersions.some((v) => v.isDefault);
  const renderableOptions: OrgTermsVersionDto[] =
    assignedVersion && assignedVersion.isArchived
      ? [...activeVersions, assignedVersion]
      : activeVersions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4" />
          Terms &amp; Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading versions…</div>
        ) : versions.length === 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <div className="font-medium">No T&amp;C versions configured.</div>
            <div className="opacity-80">
              The customer won't receive Terms with their handover. Set up the first version under
              Admin → Terms &amp; Conditions.
            </div>
          </div>
        ) : (
          <>
            <Label
              htmlFor="tc-picker"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Version applied
            </Label>
            <select
              id="tc-picker"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={value ?? ""}
              disabled={locked || disabled}
              title={locked ? lockedReason : undefined}
              onChange={(e) => {
                const next = e.target.value;
                onChange(next === "" ? null : next);
              }}
            >
              <option value="">
                {orgHasDefault ? "— Use org default —" : "— No T&C —"}
              </option>
              {renderableOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} (effective {v.effectiveDate})
                  {v.isDefault ? " · default" : ""}
                  {v.isArchived ? " · archived" : ""}
                </option>
              ))}
            </select>
            {locked && (
              <div className="text-xs text-muted-foreground">
                {lockedReason ?? "T&C cannot be changed after handover."}
              </div>
            )}
            {!locked && !value && orgHasDefault && (
              <div className="text-xs text-muted-foreground">
                Falling back to the org default at handover time.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
