import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { useListOrgCommercialRegistrationsQuery } from "@/store/api/commercial";

const LIFECYCLE_LABEL: Record<string, string> = {
  HANDED_OVER: "Handed over",
  IN_DLP: "In DLP",
  DLP_COMPLETE: "DLP complete",
  ARCHIVED: "Archived",
};

/**
 * Org-wide commercial registrations (handover units) across every commercial
 * project — the Commercial tab of the Registrations page. Rows link into the
 * owning project's workspace, where the unit is managed.
 */
export function CommercialRegistrationsPanel() {
  const navigate = useNavigate();
  const { data: regs, isLoading } = useListOrgCommercialRegistrationsQuery();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regs ?? [];
    return (regs ?? []).filter((r) =>
      [r.projectName, r.projectAddress, r.tenancyIdentifier, r.businessName]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [regs, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Handover units across your commercial projects. Open a row to manage it
          in the project workspace.
        </p>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search project, tenancy or business…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>DLP ends</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {query ? "No registrations match your search." : "No commercial registrations yet. Add them from a commercial project's workspace."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => r.projectId && navigate(`/projects/${r.projectId}/commercial?tab=registrations`)}
                >
                  <TableCell>
                    <div className="font-medium">{r.projectName || "—"}</div>
                    {r.projectAddress && <div className="text-xs text-muted-foreground">{r.projectAddress}</div>}
                  </TableCell>
                  <TableCell>
                    {r.scope === "TENANCY" ? (r.tenancyIdentifier || "Tenancy") : "Whole building"}
                    {r.level && <span className="text-muted-foreground"> · L{r.level}</span>}
                  </TableCell>
                  <TableCell>
                    {r.businessName
                      ? r.businessName
                      : <Badge variant="outline">Untagged</Badge>}
                  </TableCell>
                  <TableCell>
                    {r.status === "HANDED" ? (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">
                        {LIFECYCLE_LABEL[r.lifecycle ?? ""] ?? "Handed over"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.dlpEndDate ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
