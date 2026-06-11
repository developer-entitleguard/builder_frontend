import { useState } from "react";
import { Building2, Trash2, UserPlus } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
  useGetProjectSharesQuery,
  useShareProjectMutation,
  useRevokeProjectShareMutation,
  type ProjectShare,
} from "@/store/api/projectShares";

/**
 * Developer/Builder Decoupling PRD (Requirement 2). Developer-only card on the
 * project detail page: invite a separate builder org to work the build (by
 * email), see the current/past shares, and revoke access. Gated by the DEVELOP
 * capability at the call site; the backend additionally enforces operator-only.
 */
export function ProjectSharesCard({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { data, isLoading } = useGetProjectSharesQuery(projectId);
  const [shareProject, { isLoading: sharing }] = useShareProjectMutation();
  const [revokeShare] = useRevokeProjectShareMutation();

  const [email, setEmail] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<ProjectShare | null>(null);

  const shares = data?.data ?? [];
  const activeShare = shares.find((s) => s.status === "ACTIVE") ?? null;

  const handleShare = async () => {
    const builderEmail = email.trim();
    if (!builderEmail) {
      toast({ title: "Enter the builder's email", variant: "destructive" });
      return;
    }
    try {
      const res = await shareProject({ projectId, body: { builderEmail } }).unwrap();
      toast({ title: res.message || "Project shared" });
      setEmail("");
    } catch (err: any) {
      toast({
        title: "Could not share project",
        description: err?.data?.message ?? "The builder may not have an EntitleGuard account yet.",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      const res = await revokeShare({ projectId, shareId: pendingRevoke.id }).unwrap();
      toast({ title: res.message || "Builder access revoked" });
    } catch (err: any) {
      toast({
        title: "Could not revoke access",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingRevoke(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Delegated builder
        </CardTitle>
        <CardDescription>
          Share this project with a separate builder organisation. They can work the
          per-unit compliance worklist and shared certificates for this project only —
          never your other projects. Revoke any time; the dossier stays with you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!activeShare && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="builder-email">Builder email</Label>
              <Input
                id="builder-email"
                type="email"
                placeholder="office@builderco.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
              />
            </div>
            <Button onClick={handleShare} disabled={sharing} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {sharing ? "Sharing…" : "Share build"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading shares…</p>
        ) : shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No builder has been invited to this project yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {share.builderOrgName ?? share.builderOrgEmail ?? "Builder organisation"}
                  </p>
                  {share.builderOrgEmail && (
                    <p className="truncate text-xs text-muted-foreground">{share.builderOrgEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={share.status === "ACTIVE" ? "default" : "secondary"}>
                    {share.status === "ACTIVE" ? "Active" : "Revoked"}
                  </Badge>
                  {share.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingRevoke(share)}
                      aria-label="Revoke access"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!pendingRevoke} onOpenChange={(o) => !o && setPendingRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke builder access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke?.builderOrgName ?? "This builder"} will immediately lose access to
              this project. The documents they uploaded stay in your project dossier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revoke access</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
