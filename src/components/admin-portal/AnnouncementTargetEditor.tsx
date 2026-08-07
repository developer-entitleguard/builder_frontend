import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminQuery } from '@/store/api/admin/adminClient';
import { searchRecipients } from '@/store/api/admin/announcementsApi';
import type {
  AdminOrg,
  AnnouncementPortal,
  AnnouncementScope,
  AnnouncementTarget,
  RecipientSearchResult,
} from '@/store/api/admin/types';
import { ALL_PORTALS, ORG_PORTALS, PORTAL_LABELS } from '@/pages/admin-portal/announcementHelpers';

const SCOPES: { value: AnnouncementScope; label: string }[] = [
  { value: 'EVERYONE', label: 'Everyone (all portals)' },
  { value: 'PORTAL', label: 'A whole portal' },
  { value: 'ORG', label: 'A specific organisation' },
  { value: 'INDIVIDUAL', label: 'A specific person' },
];

/** Recipient typeahead for INDIVIDUAL targets. */
const RecipientPicker = ({
  portal,
  value,
  onPick,
}: {
  portal?: AnnouncementPortal | null;
  value?: AnnouncementTarget;
  onPick: (r: RecipientSearchResult) => void;
}) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<RecipientSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!portal || q.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      searchRecipients(portal, q.trim())
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q, portal]);

  return (
    <div className="relative">
      <Input
        placeholder={value?.recipientId ? undefined : 'Search name or email…'}
        value={q || value?.label || ''}
        disabled={!portal}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
          {results.map((r) => (
            <button
              key={`${r.recipientType}:${r.recipientId}`}
              type="button"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                onPick(r);
                setQ('');
                setOpen(false);
              }}
            >
              <span className="font-medium">{r.name || '(no name)'}</span>
              <span className="text-muted-foreground"> · {r.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** One editable target row. */
const TargetRow = ({
  target,
  onChange,
  onRemove,
}: {
  target: AnnouncementTarget;
  onChange: (t: AnnouncementTarget) => void;
  onRemove: () => void;
}) => {
  const portalOptions = target.scope === 'ORG' ? ORG_PORTALS : ALL_PORTALS;
  // Load orgs for ORG scope once a portal is chosen (existing admin endpoint).
  const orgsPath =
    target.scope === 'ORG' && target.portal ? `/api/admin/orgs/${target.portal}` : null;
  const { data: orgs } = useAdminQuery<AdminOrg[]>(orgsPath);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <div className="space-y-1">
        <Label className="text-xs">Audience</Label>
        <Select
          value={target.scope}
          onValueChange={(scope) => onChange({ scope: scope as AnnouncementScope })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(target.scope === 'PORTAL' || target.scope === 'ORG' || target.scope === 'INDIVIDUAL') && (
        <div className="space-y-1">
          <Label className="text-xs">Portal</Label>
          <Select
            value={target.portal ?? undefined}
            onValueChange={(portal) =>
              onChange({ ...target, portal: portal as AnnouncementPortal, orgId: null, recipientId: null, label: null })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {portalOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {PORTAL_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {target.scope === 'ORG' && (
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs">Organisation</Label>
          <Select
            value={target.orgId ?? undefined}
            disabled={!target.portal}
            onValueChange={(orgId) => {
              const org = orgs?.find((o) => o.id === orgId);
              onChange({ ...target, orgId, label: org?.name ?? orgId });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={target.portal ? 'Select organisation…' : 'Pick a portal first'} />
            </SelectTrigger>
            <SelectContent>
              {(orgs ?? []).map((o) => (
                <SelectItem key={o.id} value={o.id as string}>
                  {o.name || o.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {target.scope === 'INDIVIDUAL' && (
        <div className="space-y-1 flex-1 min-w-[220px]">
          <Label className="text-xs">Person</Label>
          <RecipientPicker
            portal={target.portal}
            value={target}
            onPick={(r) =>
              onChange({
                ...target,
                recipientType: r.recipientType,
                recipientId: r.recipientId,
                label: `${r.name || r.email}`,
              })
            }
          />
        </div>
      )}

      <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

/**
 * Platform Announcements — audience editor. The announcement's audience is the
 * UNION of these rows (EVERYONE / a portal / an org / a person).
 */
const AnnouncementTargetEditor = ({
  targets,
  onChange,
}: {
  targets: AnnouncementTarget[];
  onChange: (t: AnnouncementTarget[]) => void;
}) => {
  const update = (i: number, t: AnnouncementTarget) =>
    onChange(targets.map((x, idx) => (idx === i ? t : x)));
  const remove = (i: number) => onChange(targets.filter((_, idx) => idx !== i));
  const add = () => onChange([...targets, { scope: 'EVERYONE' }]);

  return (
    <div className="space-y-3">
      {targets.length === 0 && (
        <p className="text-sm text-muted-foreground">No audience yet — add at least one.</p>
      )}
      {targets.map((t, i) => (
        <TargetRow key={i} target={t} onChange={(nt) => update(i, nt)} onRemove={() => remove(i)} />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-2" />
        Add audience
      </Button>
    </div>
  );
};

export default AnnouncementTargetEditor;
