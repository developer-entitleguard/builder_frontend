import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Download, MapPin, AlertCircle, Loader2, FolderOpen } from "lucide-react";
import { useGetProjectReportQuery } from "@/store/api/reports";
import { useReportPdfDownload } from "@/lib/api/services/reportDownload";
import { ReportProgress } from "@/components/reports/ReportProgress";
import { ReportFinancial } from "@/components/reports/ReportFinancial";
import { ReportCompliance } from "@/components/reports/ReportCompliance";
import { formatDate } from "@/components/reports/reportUtils";

const ProjectReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useGetProjectReportQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );
  const { download, isLoading: isDownloading } = useReportPdfDownload();

  const report = data?.data ?? null;
  const errorMessage =
    (data && !data.success ? data.message : undefined) ??
    (isError ? "Unable to load this report." : undefined);

  // Hide a whole section when it has nothing to show.
  const hasProgress = (report?.progress.totalActivities ?? 0) > 0;
  const f = report?.financial;
  const hasFinancial = !!f && (f.hasPricing || (f.committedSpend ?? 0) > 0 || f.costItems.length > 0);
  const c = report?.compliance;
  const hasCompliance =
    !!c && ((c.projectCompleteness?.total ?? 0) > 0 || c.registrations.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/report")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to report
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              View project
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              disabled={!report}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => id && download(id)}
              disabled={!report || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {isLoading && (
          <div className="space-y-4">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{errorMessage || (error ? "Something went wrong." : "")}</span>
          </div>
        )}

        {!isLoading && report && (
          <>
            {/* Report header band */}
            <div className="border-b pb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project Management Report</p>
                  <h1 className="text-3xl font-bold text-foreground mt-1">{report.projectName}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    {report.address && (
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {report.address}
                      </span>
                    )}
                    {report.status && <Badge variant="outline">{report.status}</Badge>}
                    {report.builderOrganizationName && <span>{report.builderOrganizationName}</span>}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground shrink-0">
                  <p>Start: {formatDate(report.startDate)}</p>
                  <p>Target: {formatDate(report.targetEndDate)}</p>
                  {report.actualEndDate && <p>Actual: {formatDate(report.actualEndDate)}</p>}
                  <p className="mt-1">Generated {formatDate(report.generatedAt)}</p>
                </div>
              </div>
            </div>

            {hasProgress && <ReportProgress progress={report.progress} />}
            {hasFinancial && <ReportFinancial financial={report.financial} />}
            {hasCompliance && <ReportCompliance compliance={report.compliance} />}
            {!hasProgress && !hasFinancial && !hasCompliance && (
              <p className="text-sm text-muted-foreground">
                No progress, financial or compliance data has been added to this project yet.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ProjectReport;
