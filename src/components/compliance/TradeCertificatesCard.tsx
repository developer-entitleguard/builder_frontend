import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";
import {
  useGetRegistrationTradeCertificatesQuery,
  type TradeCertificateApi,
} from "@/store/api/complianceDocuments";

interface TradeCertificatesCardProps {
  registrationId: string;
}

const downloadHref = (cert: TradeCertificateApi): string | null => {
  if (cert.downloadType === "link" && cert.externalUrl) return cert.externalUrl;
  if (cert.fileId) return `${getApiBaseUrl()}/unsecure/download/${cert.fileId}`;
  if (cert.externalUrl) return cert.externalUrl;
  return null;
};

/**
 * Read-only panel listing trade/auditor compliance certificates produced
 * against jobs tied to this registration (PRD Phase 4 linkage). Informational
 * only — these do NOT affect the handover gate, which stays driven by the
 * builder's own required-document checklist. Hidden when there are none.
 */
export const TradeCertificatesCard = ({ registrationId }: TradeCertificatesCardProps) => {
  const { data, isLoading } = useGetRegistrationTradeCertificatesQuery({ registrationId });
  const certificates = data?.data ?? [];

  if (isLoading || certificates.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Trade compliance certificates
        </CardTitle>
        <CardDescription>
          Certificates from trades and auditors on jobs linked to this dwelling. Informational
          evidence — they don't change the handover checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {certificates.map((cert) => {
          const href = downloadHref(cert);
          const isLink = cert.downloadType === "link" || (!cert.fileId && !!cert.externalUrl);
          return (
            <div
              key={cert.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {cert.name || cert.certificateType || "Compliance certificate"}
                  </span>
                  {cert.signed && (
                    <Badge variant="secondary" className="text-xs">
                      E-signed
                    </Badge>
                  )}
                  {cert.status && (
                    <Badge variant="outline" className="text-xs">
                      {cert.status}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {cert.jobTitle && <span>Job: {cert.jobTitle}</span>}
                  {cert.issuer && <span>{cert.jobTitle ? " · " : ""}Issuer: {cert.issuer}</span>}
                </div>
                {cert.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{cert.notes}</p>
                )}
              </div>
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
                >
                  {isLink ? (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </a>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
