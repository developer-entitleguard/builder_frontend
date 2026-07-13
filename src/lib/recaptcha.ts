import { getRecaptchaSiteKey } from "@/lib/config";
import { loadScript } from "@/lib/scriptLoader";

/**
 * Google reCAPTCHA v3. The site key is public and baked in at build time; the
 * matching secret lives only on the backend, which verifies the token returned
 * here server-side before the signup creates an org/user. When no site key is
 * configured the gate is disabled and {@link executeRecaptcha} resolves to null
 * (the backend mirrors this with recaptcha.enabled=false).
 */
interface GrecaptchaV3 {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaV3;
  }
}

/**
 * Treat empty/whitespace and the deployment placeholder "disabled" as
 * "no site key configured" so the gate cleanly turns off instead of loading
 * reCAPTCHA with a bogus key.
 */
function resolveSiteKey(): string | null {
  const key = getRecaptchaSiteKey()?.trim();
  if (!key || key.toLowerCase() === "disabled") return null;
  return key;
}

export function isRecaptchaEnabled(): boolean {
  return resolveSiteKey() !== null;
}

export async function executeRecaptcha(action: string): Promise<string | null> {
  const siteKey = resolveSiteKey();
  if (!siteKey) return null;

  await loadScript(`https://www.google.com/recaptcha/api.js?render=${siteKey}`);

  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error("reCAPTCHA failed to initialise");

  await new Promise<void>((resolve) => grecaptcha.ready(() => resolve()));
  return grecaptcha.execute(siteKey, { action });
}
