import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAdminCatalogQuery,
  useGetAdminEntitlementsQuery,
  useSetAdminCapabilityMutation,
  useSetAdminBoltonMutation,
  useSetAdminComplianceLitePresetMutation,
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
  const [setLitePreset, { isLoading: presetSaving }] = useSetAdminComplianceLitePresetMutation();

  if (isLoading || !catalog || !entitlements) {
    return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  }

  const activeCaps = new Set(entitlements.capabilities);
  const activeModules = new Set(entitlements.modules);
  // Treat the org as "Lite" when the Documents surface is on and the full-flow
  // Support / Compliance modules are off — the signature of the Lite preset.
  const isLite =
    activeModules.has('DOCUMENTS') &&
    !activeModules.has('SUPPORT') &&
    !activeModules.has('COMPLIANCE_DOCS');

  const applyLite = async (enabled: boolean) => {
    try {
      await setLitePreset({ orgType, orgId, enabled }).unwrap();
      toast({
        title: enabled ? 'Compliance-Lite applied' : 'Preset cleared',
        description: enabled
          ? 'Org pinned to Projects + Registrations + Documents only.'
          : 'Bolt-ons cleared back to capability defaults.',
      });
    } catch {
      toast({
        title: 'Preset update failed',
        description: 'Could not update the Compliance-Lite preset.',
        variant: 'destructive',
      });
    }
  };

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
      <section className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Presets</h3>
          {isLite && <Badge variant="secondary">Compliance-Lite active</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Project + Compliance (Lite): a toned-down profile for self-sufficient builders — pins the
          org to Projects, Registrations and the simplified Documents surface (no Support, Sales,
          Jobs, or full Compliance). Applies the right module bolt-ons in one click.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={presetSaving} onClick={() => applyLite(true)}>
            {isLite ? 'Re-apply Compliance-Lite' : 'Apply Compliance-Lite'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={presetSaving}
            onClick={() => applyLite(false)}
          >
            Clear bolt-ons (reset to defaults)
          </Button>
        </div>
      </section>

      <Separator />

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
