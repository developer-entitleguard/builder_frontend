import { cn } from "@/lib/utils";
import type { AnnouncementView } from "@/store/api/clientAnnouncements";
import { bannerClasses } from "./severity";

/** A ribbon rendered below the header for a BANNER announcement. */
export function AnnouncementBanner({
  a,
  onDismiss,
}: {
  a: AnnouncementView;
  onDismiss?: () => void;
}) {
  return (
    <div className={cn("w-full border-b px-4 py-2 text-sm", bannerClasses[a.severity])}>
      <div className="container flex items-center gap-3">
        {a.title && <span className="font-semibold">{a.title}</span>}
        <span className="opacity-90">{a.message}</span>
        {a.linkUrl && (
          <a
            href={a.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2 whitespace-nowrap"
          >
            {a.linkLabel || "Learn more"}
          </a>
        )}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="ml-auto shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
