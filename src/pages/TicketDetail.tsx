import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useConvertTicketToQueryMutation,
  useGetTicketQuery,
  useLinkTicketToRegistrationMutation,
} from "@/store/api/tickets";
import { useDashboardRegistrationsQuery } from "@/store/api";
import { ArrowLeft, ArrowRight, LinkIcon, Wand2 } from "lucide-react";

interface DashRegistration {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contact?: string;
  address?: string;
}

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { effectiveOrganization } = useOrganization();
  const builderId = effectiveOrganization?.id;

  const { data: ticketResp, isLoading } = useGetTicketQuery({ id: id ?? "" }, { skip: !id });
  const ticket = ticketResp?.data;
  const { data: registrationsResp } = useDashboardRegistrationsQuery(
    { builderId: builderId ?? "", type: "owner" },
    { skip: !builderId },
  );
  const allRegistrations: DashRegistration[] = (registrationsResp?.data ?? []) as DashRegistration[];

  const [linkMut, { isLoading: linking }] = useLinkTicketToRegistrationMutation();
  const [convertMut, { isLoading: converting }] = useConvertTicketToQueryMutation();

  const [search, setSearch] = useState("");
  const filteredRegs = useMemo(() => {
    if (!search.trim()) return allRegistrations.slice(0, 25);
    const needle = search.toLowerCase();
    return allRegistrations
      .filter((r) =>
        [r.firstName, r.lastName, r.email, r.contact, r.address]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle))
      )
      .slice(0, 25);
  }, [allRegistrations, search]);

  if (!id) {
    return null;
  }

  const handleLink = async (registrationId: string) => {
    try {
      const res = await linkMut({ id, registrationId }).unwrap();
      if (!res.success) {
        toast({ title: "Link failed", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Linked to registration" });
    } catch (e) {
      toast({
        title: "Link failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleConvert = async () => {
    try {
      const res = await convertMut({ id }).unwrap();
      if (!res.success) {
        toast({ title: "Convert failed", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Query created", description: `Query ${res.data.queryId.slice(0, 8)}…` });
      navigate(`/queries/${res.data.queryId}`);
    } catch (e) {
      toast({
        title: "Convert failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/tickets"><ArrowLeft className="h-4 w-4 mr-1" />Triage</Link>
          </Button>
          {ticket?.linkedQueryId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/queries/${ticket.linkedQueryId}`}>
                Open linked query <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading && <Skeleton className="h-40" />}
        {ticket && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>{ticket.customerName ?? "Unknown caller"}</span>
                {ticket.priority && <Badge variant="outline">{ticket.priority}</Badge>}
                {ticket.queryType && <Badge variant="outline">{ticket.queryType}</Badge>}
                <Badge variant="default">{ticket.status}</Badge>
              </CardTitle>
              <CardDescription>
                {ticket.sourceChannel ?? "—"} via agent {ticket.agentId ?? "—"} · {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Detail label="Email" value={ticket.customerEmail} />
              <Detail label="Phone" value={ticket.customerPhone} />
              <Detail label="Address" value={ticket.customerAddress} />
              <Detail label="Category" value={ticket.category} />
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-line">{ticket.description}</p>
              </div>
              {ticket.callRecordingUrl && (
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Call recording</p>
                  <a className="text-sm underline break-all" href={ticket.callRecordingUrl} target="_blank" rel="noreferrer">
                    {ticket.callRecordingUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {ticket && ticket.status !== "CONVERTED" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="h-4 w-4" />
                Link to a registration
              </CardTitle>
              <CardDescription>
                {ticket.linkedRegistrationId
                  ? `Currently linked: ${ticket.linkedRegistrationId}`
                  : "Match the caller to a property registration before converting."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Search by name, email, phone or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="space-y-1 max-h-[260px] overflow-y-auto">
                {filteredRegs.map((r) => (
                  <div key={r.id} className="border rounded-md p-2 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <p className="font-medium text-sm">
                        {(r.firstName ?? "")} {(r.lastName ?? "")}
                      </p>
                      <p className="text-muted-foreground">
                        {r.email ?? "—"} · {r.contact ?? "—"} · {r.address ?? "—"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={ticket.linkedRegistrationId === r.id ? "default" : "outline"}
                      disabled={linking}
                      onClick={() => handleLink(r.id)}
                    >
                      {ticket.linkedRegistrationId === r.id ? "Linked" : "Link"}
                    </Button>
                  </div>
                ))}
                {filteredRegs.length === 0 && (
                  <p className="text-xs text-muted-foreground">No matching registrations.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {ticket && ticket.status !== "CONVERTED" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-4 w-4" />
                Convert to query
              </CardTitle>
              <CardDescription>
                Creates a new builder query, attaches the call recording (if any) as a comment, and marks the ticket as converted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConvert} disabled={converting}>
                {converting ? "Converting…" : "Convert to query"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm">{value ?? "—"}</p>
  </div>
);

export default TicketDetail;
