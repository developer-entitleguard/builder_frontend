/**
 * EngineeringPlan_Builder_Branding_And_Handover_Email §5.1. Client-side
 * mirror of the server's logo controls (LogoImageService) for fast feedback.
 * The server remains authoritative; anything that slips through here is
 * rejected there with a 422 and a stable `code`.
 */
export interface LogoLimits {
  logoMaxBytes: number;
  logoFormats: string[];
  logoMinWidth: number;
  logoMinHeight: number;
  logoMaxDimension: number;
}

export const DEFAULT_LOGO_LIMITS: LogoLimits = {
  logoMaxBytes: 2 * 1024 * 1024,
  logoFormats: ["image/png", "image/jpeg"],
  logoMinWidth: 80,
  logoMinHeight: 40,
  logoMaxDimension: 4000,
};

export const LOGO_ACCEPT = "image/png,image/jpeg,.png,.jpg,.jpeg";

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB` : `${Math.round(bytes / 1024)} KB`;

export const logoRulesText = (limits: LogoLimits = DEFAULT_LOGO_LIMITS): string =>
  `PNG or JPEG, up to ${formatBytes(limits.logoMaxBytes)}. At least ${limits.logoMinWidth} × ${limits.logoMinHeight} px, ` +
  `no larger than ${limits.logoMaxDimension} px on either side. We resize it to fit 600 × 200 px for the portal and emails.`;

const readDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });

/** Returns null when the file passes, else a user-facing reason. */
export async function validateLogoFile(
  file: File,
  limits: LogoLimits = DEFAULT_LOGO_LIMITS,
): Promise<string | null> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const typeOk =
    limits.logoFormats.includes(file.type) ||
    (file.type === "" && ["png", "jpg", "jpeg"].includes(ext));
  if (!typeOk) {
    return "Logo must be a PNG or JPEG image.";
  }
  if (file.size > limits.logoMaxBytes) {
    return `Logo must be ${formatBytes(limits.logoMaxBytes)} or smaller.`;
  }
  try {
    const { width, height } = await readDimensions(file);
    if (width > limits.logoMaxDimension || height > limits.logoMaxDimension) {
      return `Logo must be no larger than ${limits.logoMaxDimension} × ${limits.logoMaxDimension} px.`;
    }
    if (width < limits.logoMinWidth || height < limits.logoMinHeight) {
      return `Logo must be at least ${limits.logoMinWidth} × ${limits.logoMinHeight} px.`;
    }
  } catch {
    return "The image could not be read. Try exporting it again as PNG or JPEG.";
  }
  return null;
}

/** Map a server 422 body to a message; falls back to the server's own text. */
export function logoErrorMessage(err: unknown): string {
  const e = err as { status?: number | string; data?: unknown } | undefined;
  const data = e?.data as { error?: string; message?: string; code?: string } | string | undefined;
  if (typeof data === "string" && data) return data;
  if (data && typeof data === "object") {
    if (data.error) return data.error;
    if (data.message) return data.message;
  }
  if (e?.status === 413) return "That file is too large to upload.";
  return "Logo upload failed. Please try again.";
}
