import type {
  Announcement,
  AnnouncementPortal,
  AnnouncementSeverity,
  AnnouncementTarget,
} from '@/store/api/admin/types';

/** Portals selectable for targeting. ORG scope is limited to the org-staff four. */
export const ALL_PORTALS: AnnouncementPortal[] = [
  'BUILDER',
  'MERCHANT',
  'TRADE',
  'AUDITOR',
  'COMMERCIAL',
  'CONSUMER',
];

export const ORG_PORTALS: AnnouncementPortal[] = ['BUILDER', 'MERCHANT', 'TRADE', 'AUDITOR'];

export const PORTAL_LABELS: Record<AnnouncementPortal, string> = {
  BUILDER: 'Builder',
  MERCHANT: 'Merchant',
  TRADE: 'Trade',
  AUDITOR: 'Auditor',
  COMMERCIAL: 'Commercial',
  CONSUMER: 'Consumer',
};

export const SEVERITY_LABELS: Record<AnnouncementSeverity, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
};

/** Badge variant for a severity (maps to shadcn Badge variants). */
export const severityVariant = (
  s?: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'CRITICAL':
      return 'destructive';
    case 'WARNING':
      return 'default';
    default:
      return 'secondary';
  }
};

/** Human summary of one target row. */
const targetLabel = (t: AnnouncementTarget): string => {
  switch (t.scope) {
    case 'EVERYONE':
      return 'Everyone';
    case 'PORTAL':
      return t.portal ? PORTAL_LABELS[t.portal as AnnouncementPortal] ?? t.portal : 'Portal';
    case 'ORG':
      return `${t.portal ? PORTAL_LABELS[t.portal as AnnouncementPortal] ?? t.portal : 'Org'} · ${
        t.label || t.orgId || 'org'
      }`;
    case 'INDIVIDUAL':
      return t.label || t.recipientId || 'individual';
    default:
      return t.scope;
  }
};

/** Comma-joined audience summary for a list row. */
export const audienceSummary = (a: Announcement): string => {
  if (!a.targets || a.targets.length === 0) return '—';
  if (a.targets.some((t) => t.scope === 'EVERYONE')) return 'Everyone';
  return a.targets.map(targetLabel).join(', ');
};
