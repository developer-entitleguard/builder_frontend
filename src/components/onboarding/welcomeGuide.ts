// Helpers for the first-run Welcome guide, kept out of the component file so
// fast-refresh stays happy (component files should export only components).

export const welcomeSeenKey = (orgId: string | null | undefined) =>
  `eg_welcome_seen_${orgId ?? "unknown"}`;

/** Event that re-opens the welcome guide on demand (e.g. from the Help menu). */
export const OPEN_WELCOME_EVENT = "eg:open-welcome";

/**
 * Re-open the welcome guide from anywhere. Clears the per-org "seen" flag so it
 * shows even after first run, and fires an event in case the dialog is already
 * mounted (i.e. the user is on the dashboard).
 */
export const openWelcomeGuide = (orgId: string | null | undefined) => {
  try {
    localStorage.removeItem(welcomeSeenKey(orgId));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(OPEN_WELCOME_EVENT));
};
