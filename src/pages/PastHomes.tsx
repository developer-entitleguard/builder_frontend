import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Home, Upload } from "lucide-react";
import {
  downloadPastHomesTemplate,
  pastHomesErrorMessage,
  useImportPastHomesMutation,
  useListPastHomeBatchesQuery,
} from "@/store/api/pastHomes";
import { ACTIVATION_LABEL, ROW_STATUS_LABEL, fmtDate, parseCounts } from "@/components/pastHomes/pastHomesCopy";

/**
 * Past Homes (PH1 to PH12). A builder brings in homes it finished before
 * joining, confirms each one against its handover documents, then invites the
 * owners. This page lists the import batches; each batch has its own page.
 */
const PastHomes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: batches, isLoading, error } = useListPastHomeBatchesQuery();
  const [importSheet, { isLoading: importing }] = useImportPastHomesMutation();

  const onTemplate = async () => {
    setDownloading(true);
    try {
      await downloadPastHomesTemplate();
    } catch (e) {
      toast({
        title: "Could not download the template",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const batch = await importSheet({ file }).unwrap();
      toast({ title: "Spreadsheet imported", description: "Check each home, then confirm it." });
      navigate(`/past-homes/${batch.id}`);
    } catch (e) {
      toast({
        title: "Could not import the spreadsheet",
        description: pastHomesErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="h-7 w-7" />
            Past Homes
          </h1>
          <p className="text-muted-foreground mt-1">
            Add homes you finished before you joined. Upload a spreadsheet, check each home against its
            handover documents, then invite the owners to take up their home record.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import a spreadsheet</CardTitle>
            <CardDescription>
              Use the template. Required columns: address, completionDate and ownerFirstName. Dates are
              YYYY-MM-DD. CSV or XLSX.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onTemplate} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Downloading…" : "Download template"}
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? "Importing…" : "Upload spreadsheet"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{pastHomesErrorMessage(error, "Could not load imports")}</p>
            ) : !batches || batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead>Homes</TableHead>
                    <TableHead>Invitations</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => {
                    const counts = parseCounts(b.countsJson);
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <Link to={`/past-homes/${b.id}`} className="font-medium text-primary hover:underline">
                            {b.fileName || "Untitled import"}
                          </Link>
                          {b.status === "ROLLED_BACK" && (
                            <Badge variant="secondary" className="ml-2">Rolled back</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{fmtDate(b.createdAt)}</TableCell>
                        <TableCell className="text-sm">
                          {counts.statuses.length === 0
                            ? "—"
                            : counts.statuses
                                .map(([k, v]) => `${v} ${ROW_STATUS_LABEL[k as keyof typeof ROW_STATUS_LABEL]?.toLowerCase() ?? k}`)
                                .join(", ")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {counts.activations.length === 0
                            ? "—"
                            : counts.activations
                                .map(([k, v]) => `${v} ${ACTIVATION_LABEL[k as keyof typeof ACTIVATION_LABEL]?.toLowerCase() ?? k}`)
                                .join(", ")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {b.contactConfirmedAt ? `Confirmed ${fmtDate(b.contactConfirmedAt)}` : "Not confirmed"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PastHomes;
