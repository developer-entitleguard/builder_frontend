import { useNavigate } from "react-router-dom";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useOrganization } from "@/hooks/useOrganization";
import { isAdministrator, isCustomerSupport, readBuilderRoleFromStorage } from "@/lib/roles";
import { recoveryErrorMessage, useRaiseRecoveryCaseMutation } from "@/store/api/recovery";

/**
 * "Start a recovery case" on a query (Defect Recovery DR1). DEFECT_RECOVERY
 * module; Administrator and Customer Support (RECOVERY_RAISE). Raises a draft
 * case from the query and opens it; nothing is sent until an Administrator
 * approves the notice.
 */
const StartRecoveryCaseButton = ({ queryId }: { queryId: string }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { ready, hasModule } = useEntitlements();
  const { builderRole } = useOrganization();
  const role = builderRole ?? readBuilderRoleFromStorage();
  const [raise, { isLoading }] = useRaiseRecoveryCaseMutation();

  if (!ready || !hasModule("DEFECT_RECOVERY") || !(isAdministrator(role) || isCustomerSupport(role))) return null;

  const start = async () => {
    try {
      const d = await raise({ queryId }).unwrap();
      navigate(`/recovery/cases/${d.summary.id}`);
    } catch (e) {
      toast({ title: "Could not start the case", description: recoveryErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <Button variant="outline" onClick={start} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
      Start a recovery case
    </Button>
  );
};

export default StartRecoveryCaseButton;
