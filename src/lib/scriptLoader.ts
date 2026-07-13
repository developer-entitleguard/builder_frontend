/**
 * Loads an external <script> once, de-duplicating concurrent callers. Used for
 * the Google reCAPTCHA SDK, which is injected lazily on the signup page (never
 * bundled — it depends on a runtime config key).
 */
const loaded = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loaded.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });

  loaded.set(src, promise);
  return promise;
}
