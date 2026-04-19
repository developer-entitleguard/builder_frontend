import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { useGetRegistrationWarrantiesQuery, type WarrantyEntry } from "@/store/api/roleDashboards";

const STATUS: Record<WarrantyEntry["status"], { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Active", icon: <ShieldCheck className="h-3 w-3" />, variant: "secondary" },
  EXPIRING: { label: "Expiring", icon: <ShieldAlert className="h-3 w-3" />, variant: "default" },
  EXPIRED: { label: "Expired", icon: <ShieldOff className="h-3 w-3" />, variant: "destructive" },
  UNKNOWN: { label: "Unknown", icon: <ShieldAlert className="h-3 w-3" />, variant: "outline" },
};

interface WarrantyTrackerProps {
  registrationId: string;
}

export const WarrantyTracker = ({ registrationId }: WarrantyTrackerProps) => {
  const { data, isLoading } = useGetRegistrationWarrantiesQuery({ id: registrationId });
  const payload = data?.data;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warranty status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (!payload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warranty status</CardTitle>
          <CardDescription>No warranty data available.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const houseMeta = STATUS[payload.houseWarrantyStatus] ?? STATUS.UNKNOWN;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Warranty status</CardTitle>
        <CardDescription>
          House-level warranty (3 months from settlement) and per-item coverage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between border rounded-md p-2">
          <div>
            <p className="font-medium text-sm">House warranty</p>
            <p className="text-xs text-muted-foreground">
              Ends {payload.houseWarrantyEndsAt ?? "—"}
            </p>
          </div>
          <Badge variant={houseMeta.variant} className="flex items-center gap-1">
            {houseMeta.icon}
            {houseMeta.label}
          </Badge>
        </div>

        {payload.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No mapped items.</p>
        ) : (
          <div className="space-y-1">
            {payload.items.map((item) => {
              const meta = STATUS[item.status] ?? STATUS.UNKNOWN;
              return (
                <div key={item.itemMapId} className="flex items-center justify-between text-xs border rounded-md p-2">
                  <div>
                    <p className="font-medium">{item.name ?? "Unnamed"}</p>
                    <p className="text-muted-foreground">
                      {item.category ?? "—"} · ends {item.warrantyEndsAt ?? "—"}
                    </p>
                  </div>
                  <Badge variant={meta.variant} className="flex items-center gap-1">
                    {meta.icon}
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarrantyTracker;
