import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  Ticket as TicketIcon,
  MessageSquarePlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type BuilderNotification,
} from "@/lib/api/services/notifications";

function formatDate(dateString: string) {
  // Backend LocalDateTime has no timezone and the server is UTC — tag it so JS
  // renders it in the viewer's local zone instead of treating it as local.
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(dateString);
  const d = new Date(!hasTz && dateString.includes("T") ? `${dateString}Z` : dateString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeIcon(type: string) {
  switch (type) {
    case "TICKET_CREATED":
      return <TicketIcon className="h-5 w-5 text-blue-600" />;
    case "QUERY_CREATED":
      return <MessageSquarePlus className="h-5 w-5 text-primary" />;
    case "JOB_COMPLETED":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "JOB_CANCELLED":
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

const Notifications = () => {
  const navigate = useNavigate();
  const { data, isLoading, isFetching } = useListNotificationsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const notifications: BuilderNotification[] = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const loading = isLoading || isFetching;

  const handleClick = async (n: BuilderNotification) => {
    if (!n.isRead) {
      try {
        await markRead({ id: n.id }).unwrap();
      } catch {
        // Non-blocking — still navigate even if the read-marking fails.
      }
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              New tickets, new queries, and job completions or cancellations.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              disabled={markingAll}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BellOff className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You're all caught up. No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                onClick={() => handleClick(n)}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  n.isRead ? "" : "border-primary/40 bg-primary/5"
                }`}
              >
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="mt-0.5 shrink-0">{typeIcon(String(n.type))}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {n.title || "Notification"}
                      </p>
                      {!n.isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary shrink-0"
                          aria-label="Unread"
                        />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {n.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
