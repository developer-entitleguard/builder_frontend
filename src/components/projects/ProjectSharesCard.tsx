import { useState } from "react";
import { Building2, Trash2, UserPlus, Search, Check, Headset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  useUpdateProjectShareMutation,
  useRevokeProjectShareMutation,
  useLazySearchOrganizationsQuery,
  type ProjectShare,
  type OrgOption,
} from "@/store/api/projectShares";
import { useEntitlements } from "@/hooks/useEntitlements";

/**
 * User change request (points 3 & 4). Share a project with a developer
 * organisation: pick an existing org by name, or invite a new one by name +
 * email (they're emailed to set a password and continue). By default only the
 * invited email gets access; an admin can open it to the whole org.
 */
export function ProjectSharesCard({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { data, isLoading } = useGetProjectSharesQuery(projectId);
  const [shareProject, { isLoading: sharing }] = useShareProjectMutation();
  const [updateShare] = useUpdateProjectShareMutation();
  const [revokeShare] = useRevokeProjectShareMutation();
  const [searchOrgs, { data: searchData, isFetching: searching }] =
    useLazySearchOrganizationsQuery();
  const { hasModule } = useEntitlements();
  const developerHasActivities = hasModule("ACTIVITIES");

  const [name, setName] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [inviteNew, setInviteNew] = useState(false);
  const [email, setEmail] = useState("");
  const [wholeOrg, setWholeOrg] = useState(false);
  const [delegateSupport, setDelegateSupport] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<ProjectShare | null>(null);

  const shares = data?.data ?? [];
  const activeShare = shares.find((s) => s.status === "ACTIVE") ?? null;
  const results = searchData?.data ?? [];

  const onNameChange = (value: string) => {
    setName(value);
    setSelectedOrg(null);
    setInviteNew(false);
    if (value.trim().length >= 2) {
      searchOrgs(value.trim());
    }
  };

  const resetForm = () => {
    setName("");
    setSelectedOrg(null);
    setInviteNew(false);
    setEmail("");
    setWholeOrg(false);
    setDelegateSupport(false);
  };

  const handleShare = async () => {
    const body: {
      builderOrgId?: string;
      orgName?: string;
      builderEmail?: string;
      wholeOrgAccess?: boolean;
      delegateSupport?: boolean;
    } = { wholeOrgAccess: wholeOrg, delegateSupport };

    if (selectedOrg) {
      body.builderOrgId = selectedOrg.id;
      if (email.trim()) body.builderEmail = email.trim();
    } else if (inviteNew) {
      if (!name.trim() || !email.trim()) {
        toast({ title: "Enter the organisation name and an email", variant: "destructive" });
        return;
      }
      body.orgName = name.trim();
      body.builderEmail = email.trim();
    } else {
      toast({ title: "Pick an organisation or invite a new one", variant: "destructive" });
      return;
    }
    if (!wholeOrg && !body.builderEmail && !selectedOrg) {
      toast({ title: "An email is required", variant: "destructive" });
      return;
    }

    try {
      const res = await shareProject({ projectId, body }).unwrap();
      toast({ title: res.message || "Project shared" });
      resetForm();
    } catch (err: any) {
      toast({
        title: "Could not share project",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSupport = async (share: ProjectShare, next: boolean) => {
    try {
      await updateShare({ projectId, shareId: share.id, body: { delegateSupport: next } }).unwrap();
      toast({
        title: next ? "Support delegated to the builder" : "You’ve taken support back",
      });
    } catch (err: any) {
      toast({
        title: "Could not update support",
        description: err?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      const res = await revokeShare({ projectId, shareId: pendingRevoke.id }).unwrap();
      toast({ title: res.message || "Access revoked" });
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
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Building2 className="h-5 w-5" />
          Share with a developer organisation
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The organisation can work this project only. By default just the invited person has
          access; tick the box below to open it to their whole organisation. Revoke any time —
          the documents stay in your project.
        </p>
      </div>

      {!activeShare && (
        <div className="space-y-4 rounded-md border p-4">
          {/* Organisation name + autocomplete */}
          <div className="space-y-1">
            <Label htmlFor="org-name">Organisation name</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="org-name"
                className="pl-8"
                placeholder="Start typing the developer's name…"
                value={selectedOrg ? selectedOrg.name : name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>

            {!selectedOrg && name.trim().length >= 2 && (
              <div className="mt-1 rounded-md border">
                {searching ? (
                  <p className="p-2 text-sm text-muted-foreground">Searching…</p>
                ) : results.length > 0 ? (
                  <ul className="max-h-40 overflow-auto">
                    {results.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                          onClick={() => {
                            setSelectedOrg(o);
                            setInviteNew(false);
                          }}
                        >
                          <span className="text-sm font-medium">{o.name}</span>
                          {o.email && (
                            <span className="text-xs text-muted-foreground">{o.email}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => setInviteNew(true)}
                  >
                    Not found — invite “{name.trim()}” as a new organisation
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Email: invited user (existing org) or new-org admin */}
          {(selectedOrg || inviteNew) && (
            <div className="space-y-1">
              <Label htmlFor="org-email">
                {inviteNew ? "Admin email (they’ll be invited to set a password)" : "User email to grant"}
              </Label>
              <Input
                id="org-email"
                type="email"
                placeholder="person@developer.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {(selectedOrg || inviteNew) && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={wholeOrg}
                onCheckedChange={(v) => setWholeOrg(v === true)}
              />
              Give everyone in this organisation access
            </label>
          )}

          {/* Responsibility split. Build is always delegated; support is optional. */}
          {(selectedOrg || inviteNew) && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">This builder will handle the build</p>
                <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                  {developerHasActivities && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> Manage activities
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Customer handover
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Compliance
                  </li>
                </ul>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={delegateSupport}
                  onCheckedChange={(v) => setDelegateSupport(v === true)}
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Headset className="h-4 w-4" /> Also let them handle support
                  </span>
                  <span className="text-muted-foreground">
                    Homeowner tickets &amp; queries for these homes go to the builder too. Leave
                    unticked to keep support yourself — you’ll still see which builder built each home.
                  </span>
                </span>
              </label>
            </div>
          )}

          <Button
            onClick={handleShare}
            disabled={sharing || (!selectedOrg && !inviteNew)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {sharing ? "Sharing…" : "Share project"}
          </Button>
        </div>
      )}

      {/* Current + past shares */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : shares.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This project hasn’t been shared with anyone yet.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {shares.map((share) => (
            <li key={share.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">
                  {share.builderOrgName ?? share.sharedWithUserEmail ?? "Organisation"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {share.wholeOrgAccess
                    ? "Whole organisation"
                    : share.sharedWithUserEmail ?? "Single user"}
                </p>
                {share.status === "ACTIVE" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={!!share.delegateSupport}
                      onCheckedChange={(v) => handleToggleSupport(share, v === true)}
                    />
                    <span className="flex items-center gap-1">
                      <Headset className="h-3.5 w-3.5" />
                      {share.delegateSupport
                        ? "Builder handles support"
                        : "You handle support"}
                    </span>
                  </label>
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

      <AlertDialog open={!!pendingRevoke} onOpenChange={(o) => !o && setPendingRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke?.builderOrgName ?? "This organisation"} will immediately lose access
              to this project. Anything they uploaded stays in your project dossier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revoke access</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
