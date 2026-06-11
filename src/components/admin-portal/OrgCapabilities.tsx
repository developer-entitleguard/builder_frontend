import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAdminCatalogQuery,
  useGetAdminEntitlementsQuery,
  useSetAdminCapabilityMutation,
  useSetAdminBoltonMutation,
} from '@/store/api/admin';

interface Props {
  orgType: string;
  orgId: string;
}

/** Capability toggles + per-module bolt-on overrides for one org. */
const OrgCapabilities = ({ orgType, orgId }: Props) => {
  const { toast } = useToast();
  const { data: catalog } = useGetAdminCatalogQuery();
  const { data: entitlements, isLoading } = useGetAdminEntitlementsQuery({ orgType, orgId });
  const [setCapability] = useSetAdminCapabilityMutation();
  const [setBolton] = useSetAdminBoltonMutation();

  if (isLoading || !catalog || !entitlements) {
    return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  }

  const activeCaps = new Set(entitlements.capabilities);
  const activeModules = new Set(entitlements.modules);

  const onCapability = async (key: string, enabled: boolean) => {
    try {
      await setCapability({ orgType, orgId, key, enabled }).unwrap();
    } catch {
      toast({ title: 'Update failed', description: `Could not toggle ${key}`, variant: 'destructive' });
    }
  };

  const onBolton = async (key: string, enabled: boolean) => {
    try {
      await setBolton({ orgType, orgId, key, enabled }).unwrap();
    } catch {
      toast({ title: 'Update failed', description: `Could not toggle ${key}`, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Capabilities</h3>
          <p className="text-sm text-muted-foreground">What this organization can do on the platform.</p>
        </div>
        <div className="space-y-3">
          {catalog.capabilities.map((cap) => (
            <div key={cap} className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor={`cap-${cap}`}>{cap}</Label>
              <Switch
                id={`cap-${cap}`}
                checked={activeCaps.has(cap)}
                onCheckedChange={(v) => onCapability(cap, v)}
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Modules (bolt-on overrides)</h3>
          <p className="text-sm text-muted-foreground">
            Force a module on or off, independent of the capability defaults.
          </p>
        </div>
        <div className="space-y-3">
          {catalog.modules.map((mod) => (
            <div key={mod} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Label htmlFor={`mod-${mod}`}>{mod}</Label>
                {activeModules.has(mod) && <Badge variant="secondary">effective</Badge>}
              </div>
              <Switch
                id={`mod-${mod}`}
                checked={activeModules.has(mod)}
                onCheckedChange={(v) => onBolton(mod, v)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OrgCapabilities;
