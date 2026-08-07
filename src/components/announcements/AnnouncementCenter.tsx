import { useMemo, useState } from "react";
import {
  useGetMyAnnouncementsQuery,
  useAckMyAnnouncementMutation,
} from "@/store/api/clientAnnouncements";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { AnnouncementModal } from "./AnnouncementModal";

/** Refresh cadence so a newly-published notice appears without a reload. */
const POLL_MS = 120_000;

/**
 * Platform Announcements host. Fetches (and polls) the announcements targeted at
 * the signed-in user, renders BANNER ribbons inline and one MODAL at a time, and
 * records acknowledgement/dismissal. Mount once inside the authenticated shell,
 * between the header and the main content.
 */
export function AnnouncementCenter() {
  const { data } = useGetMyAnnouncementsQuery(undefined, {
    pollingInterval: POLL_MS,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const [ack] = useAckMyAnnouncementMutation();
  // Locally hide an item the moment it's acked, before the refetch lands.
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const items = useMemo(
    () => (data ?? []).filter((a) => !hidden.has(a.id)),
    [data, hidden],
  );
  const banners = items.filter((a) => a.kind === "BANNER");
  const modal = items.find((a) => a.kind === "MODAL");

  const acknowledge = async (id: string) => {
    setHidden((prev) => new Set(prev).add(id));
    try {
      await ack(id).unwrap();
    } catch {
      // Failed ack: drop the local hide so it reappears on the next poll.
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      {banners.map((a) => (
        <AnnouncementBanner
          key={a.id}
          a={a}
          onDismiss={a.dismissible ? () => acknowledge(a.id) : undefined}
        />
      ))}
      {modal && <AnnouncementModal key={modal.id} a={modal} onAcknowledge={() => acknowledge(modal.id)} />}
    </>
  );
}
