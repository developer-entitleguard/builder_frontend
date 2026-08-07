import type { AnnouncementView } from "@/store/api/clientAnnouncements";

/** Ribbon colour classes per severity (light + dark). */
export const bannerClasses: Record<AnnouncementView["severity"], string> = {
  INFO: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900",
  WARNING:
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900",
  CRITICAL:
    "bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-900",
};
