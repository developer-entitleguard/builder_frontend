import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Inbox } from "lucide-react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { viewPhotoUrl } from "@/lib/api/services/files";
import TargetResponsePanel from "@/components/recovery/TargetResponsePanel";
import {
  fmtRecoveryDate,
  recoveryErrorMessage,
  savePack,
  useAddIncomingEvidenceMutation,
  useDownloadRecoveryPackMutation,
  useGetIncomingNoticeQuery,
  useGetIncomingNoticesQuery,
  useRespondIncomingNoticeMutation,
} from "@/store/api/recovery";

const NoticeDetail = ({ id }: { id: string }) => {
  const { toast } = useToast();
  const { data, isLoading, error } = useGetIncomingNoticeQuery(id);
  const [respond] = useRespondIncomingNoticeMutation();
  const [addEvidence] = useAddIncomingEvidenceMutation();
  const [download] = useDownloadRecoveryPackMutation();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) {
    return <p className="text-sm text-destructive">{recoveryErrorMessage(error, "Could not load this notice")}</p>;
  }

  const fail = (title: string, e: unknown) => {
    toast({ title, description: recoveryErrorMessage(e), variant: "destructive" });
    return false;
  };

  return (
    <TargetResponsePanel
      view={data}
      handlers={{
        respond: async (action, note, file) => {
          try {
            await respond({ id, action, note, file }).unwrap();
            toast({ title: "Response sent" });
            return true;
          } catch (e) {
            return fail("Could not send your response", e);
          }
        },
        addEvidence: async (note, file) => {
          try {
            await addEvidence({ id, note, file }).unwrap();
            toast({ title: "Evidence added" });
            return true;
          } catch (e) {
            return fail("Could not add evidence", e);
          }
        },
        download: async () => {
          try {
            savePack(await download({ path: `incoming/${id}/pack`, fallbackName: "record-of-events.zip" }).unwrap());
          } catch (e) {
            fail("Could not download", e);
          }
        },
        onError: (m) => toast({ title: "File too large", description: m, variant: "destructive" }),
        fileHref: viewPhotoUrl,
      }}
    />
  );
};

/**
 * Notices received (DR3, DR9): a developer's recovery case that names this
 * builder as the recipient. Administrator (RECOVERY_RESPOND). The same screen
 * a trade sees. Never shows other cases or any count of cases.
 */
const RecoveryNotices = () => {
  const { id } = useParams<{ id: string }>();
  const { data: rows, isLoading, error } = useGetIncomingNoticesQuery(undefined, { skip: !!id });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {id ? (
          <>
            <Link to="/recovery/notices" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Notices received
            </Link>
            <NoticeDetail id={id} />
          </>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Inbox className="h-7 w-7" />
                Notices received
              </h1>
              <p className="text-muted-foreground mt-1">
                Notices about a defect that another business sent you, with the record of events they rely on.
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : error ? (
              <p className="text-sm text-destructive">{recoveryErrorMessage(error, "Could not load notices")}</p>
            ) : !rows || rows.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">No notices.</CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <Link to={`/recovery/notices/${r.id}`} className="block px-4 py-3 hover:bg-muted/60">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm">{r.title || "Notice"}</span>
                            <Badge variant="secondary">{r.statusLabel}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.responseDueOn ? `Reply by ${fmtRecoveryDate(r.responseDueOn)}` : ""}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default RecoveryNotices;
