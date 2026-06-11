import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { AdminOrg } from '@/store/api/admin';

interface OrgFormProps {
  orgType: string;
  initial?: AdminOrg;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (org: AdminOrg) => void;
}

const isProfileType = (t: string) => t === 'TRADE' || t === 'AUDITOR';

/** Shared create/edit form for all four org types; fields vary by orgType. */
const OrgForm = ({ orgType, initial, submitting, submitLabel = 'Save', onSubmit }: OrgFormProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [abn, setAbn] = useState(initial?.abn ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [licenceNumber, setLicenceNumber] = useState(initial?.licenceNumber ?? '');
  const [services, setServices] = useState((initial?.services ?? []).join('\n'));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: AdminOrg = {
      orgType,
      name,
      abn: abn || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      isActive,
    };
    if (orgType === 'BUILDER') {
      body.address = address || null;
      body.description = description || null;
    }
    if (isProfileType(orgType)) {
      body.licenceNumber = licenceNumber || null;
      body.services = services.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="abn">ABN</Label>
          <Input id="abn" value={abn ?? ''} onChange={(e) => setAbn(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail ?? ''}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input id="contactPhone" value={contactPhone ?? ''} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
      </div>

      {orgType === 'BUILDER' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address ?? ''} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </>
      )}

      {isProfileType(orgType) && (
        <>
          <div className="space-y-2">
            <Label htmlFor="licenceNumber">Licence number</Label>
            <Input id="licenceNumber" value={licenceNumber ?? ''} onChange={(e) => setLicenceNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="services">Services (one per line)</Label>
            <Textarea id="services" rows={4} value={services} onChange={(e) => setServices(e.target.value)} />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Switch id="isActive" checked={!!isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
};

export default OrgForm;
